var currentBookInput = ''
var currentBook = ''
var currentBookIndex = 0
var currentChapter = 1
var verseHighlight = -1

var bookList = Object.keys(bible)

$(document).ready(function() {
  let searchParams = new URLSearchParams(window.location.search)

  // Nav
  $(".navSearch").on('submit', (e) => {
    e.preventDefault()
    location.href = `./search.html?search=${$(".navSearchInput").val()}`
  })

  resetMainDrop()
  $(".advDropContainer").hide()
  $(".advInputText").focus(() => {
    $(".advInputText").val("")
    currentBookInput = ""
    resetMainDrop()
    $(".advDropContainer").show()
  })
  $(".advInputText").on('input', e => {
    currentBookInput = e.target.value
    resetMainDrop()
  })
  $(".bookInput").on('focusout', (e) => {
    const currentTarget = e.currentTarget;
    requestAnimationFrame(() => {
      if (!currentTarget.contains(document.activeElement)) {
        $(".advDropContainer").hide();
      }
    });
  })

  // Quick Chapter Controls
  $(".qsPopup").hide()
  $(".qsButton").click (e => {
    $(".qsPopup").toggle()
  })

  $(".chapterQuickSelect").on('focusout', (e) => {
    const currentTarget = e.currentTarget;
    requestAnimationFrame(() => {
      if (!currentTarget.contains(document.activeElement)) {
        $(".qsPopup").hide();
      }
    });
  })

  // Main Chapter controls
  $(".chapterInput").change(e => {
    handleChapterChange(parseInt(e.target.value))
  })

  $(".chapterInput").on('focus', () => {
    $(".chapterInput").val("")
  })

  $(".chapterInput").on('focusout', () => {
    $(".chapterInput").val(currentChapter)
  })

  $(".page-item.first").click(e => handleChapterChange(1))
  $(".page-item.last").click(e => handleChapterChange(bible[currentBook].length))
  $(".page-item.previous").click(e => {
    if (currentChapter === 1) {
      if (currentBookIndex > 0) {
        handleBookChange(currentBookIndex - 1, false)
        handleChapterChange(bible[currentBook].length)
      }
    }
    else {
      handleChapterChange(currentChapter - 1)
    }
  })
  $(".page-item.next").click(e => {
    if (currentChapter === bible[currentBook].length) {
      if (currentBookIndex < bookList.length - 1) {
        handleBookChange(currentBookIndex + 1)
      }
    }
    else {
      handleChapterChange(currentChapter + 1)
    }
  })
  $(".page-item.previousBook").click(e => {
    if (currentBookIndex > 0) {
      handleBookChange(currentBookIndex - 1)
      // handleChapterChange(bible[currentBook].length)
    }
  })
  $(".page-item.nextBook").click(e => {
    if (currentBookIndex < bookList.length - 1) {
      handleBookChange(currentBookIndex + 1)
    }
  })

  // Set Verse (If Any)
  verseHighlight = isNaN(searchParams.get('verse')) ? -1 : parseInt(searchParams.get('verse'))

  // Set book
  let bookParam = searchParams.get('book')
  if (bookParam) {
    if (isNaN(bookParam)) {
      bookParam = bookList.indexOf(bookParam)
      if (bookParam === -1) bookParam = 0
    }
    else {
      bookParam = parseInt(bookParam)
    }
    handleBookChange(bookParam, false)
  }
  else {
    handleBookChange(0, false)
  }

  // Set Chapter
  let chapterParam = searchParams.get('chapter') || 1
  if (!isNaN(chapterParam)) {
    chapterParam = parseInt(chapterParam)
    if (chapterParam > 0 && chapterParam <= bible[currentBook].length) {
      handleChapterChange(chapterParam)
    }
    else {
      handleChapterChange(1)
    }
  }
})

function resetDropList(listElement, valueList, selectedVal, filterFunction, changeHandler) {
  listElement.empty()
  valueList.forEach((val,i) => {
    if (!filterFunction(val)) return;
    let newElement = $(`<li class="bookFocusGroup ${val === selectedVal ? 'active' : 'inactive'}"><button class="dropdown-item d-flex align-items-center">${val}</button></li>`)
    newElement.click(e => {
      e.preventDefault()
      changeHandler(val, i)
      $(".advDropContainer").hide()
    })
    newElement.appendTo(listElement)
  })
}

function resetMainDrop () {
  resetDropList($(".advDropContainer"), bookList, currentBook, (t) => t.toLowerCase().includes(currentBookInput.toLowerCase()), (v,i) => handleBookChange(i))
}

function resetChapterQS () {
  
  $(".qsPopupBody").empty()
  const maxChapter = bible[currentBook].length
  for (let i = 0; i < maxChapter / 5; i++) {
    const newRow = $("<tr></tr>")
    for (let j = i * 5; j < (i * 5 + 5) && j < maxChapter; j++) {
      const newCol = $(`<td><button>${j + 1}</button></td>`)
      newCol.click(() => {
        handleChapterChange(j + 1)
        $(".qsPopup").hide()
      })
      newCol.appendTo(newRow)
    }
    newRow.appendTo($(".qsPopupBody"))
  }
}

function handleBookChange (newBookIndex, triggerChapterChange = true) {
  let newBook = bookList[newBookIndex]
  console.log(`book change to "${newBookIndex}"`)
  currentBookInput = newBook
  currentBook = newBook
  currentBookIndex = newBookIndex
  $(".advInputText").val(currentBookInput)
  console.log(newBook)
  if (triggerChapterChange) handleChapterChange(1)
  $(".chapterInput").attr('max', bible[newBook].length)
  $(".page-item.last>.page-link").html(bible[newBook].length)
  $(".page-item.previousBook").toggleClass('disabled', currentBookIndex === 0)
  $(".page-item.nextBook").toggleClass('disabled', currentBookIndex === bookList.length - 1)

  resetChapterQS()
}

function handleChapterChange (newChapter) {
  console.log(currentBook)
  if (newChapter < 1 || newChapter > bible[currentBook].length) return
  currentChapter = newChapter
  $(".page-item.previous").toggleClass('disabled', currentChapter === 1 && currentBookIndex === 0)
  $(".page-item.next").toggleClass('disabled', currentChapter === bible[currentBook].length && currentBookIndex === bookList.length - 1)
  $(".chapterInput").val(newChapter)
  $(".qsButton").html(`Chapter ${newChapter}`)

  // Show or hide stuff
  $(".page-item.first").toggle(newChapter > 1)
  $(".page-item.dottedFront").toggle(newChapter > 2)
  $(".page-item.dottedBack").toggle(newChapter < bible[currentBook].length - 1)
  $(".page-item.last").toggle(newChapter < bible[currentBook].length)

  $('.contentBody').empty()
  let chapterContent = bible[currentBook][newChapter - 1]
  chapterContent.forEach((verse, i) => {
    $(`<tr class="verseRow${(verseHighlight === i + 1) ? ' highlighted' : ''}"><td>${newChapter}:${i+1}</td><td>${verse}</td></tr>`).appendTo($('.contentBody'))
  })

  verseHighlight = -1
}