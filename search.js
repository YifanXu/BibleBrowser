var resultsPerPage = 30;

var page = 0;
var pageSize = 30;

var index = bibleIndex.index
var chapters = bibleIndex.chapters

var results = []

var searchMethods = {
  "Indexed": executeIndexedSearch,
  "Sequential": executeSequentialSearch
}
var currentSearchMethod = "Indexed"

$(document).ready(function() {
  $(".searchNav").hide()
  $(".searchForm").on('submit', e => executeSearch(e, $(".searchInputText").val()))

  // Nav
  $(".navSearch").on('submit', (e) => {
    e.preventDefault()
    location.href = `./search.html?search=${$(".navSearchInput").val()}`
  })

  let searchParams = new URLSearchParams(window.location.search)
  console.log(searchParams)

  if (searchParams.has('pageSize') && !isNaN(searchParams.get('pageSize'))) {
    pageSize = parseInt(searchParams.get('pageSize'));
    console.log(pageSize)
  }

  if (searchParams.has('search')) {
    if (searchParams.has('page') && !isNaN(searchParams.get('page'))) {
      page = parseInt(searchParams.get('page')) - 1
    }
    executeSearch(null, searchParams.get('search'), false)
    $(".searchInputText").val(searchParams.get('search'))
  }

  $(".page-item.first").click(() => resultSkipTo(0))
  $(".page-item.last").click(() => resultSkipTo(Math.floor(results.length / pageSize)))
  $(".page-item.previous").click(() => resultSkipTo(page - 1))
  $(".page-item.next").click(() => resultSkipTo(page + 1))

  $(".pageInput").change(e => {
    resultSkipTo(parseInt(e.target.value))
  })

  Object.keys(searchMethods).forEach(methodName => {
    $(`<option ${currentSearchMethod === methodName ? 'selected ' : ''}value="${methodName}">${methodName}</option>`).appendTo($(".methodSelect"))
  })

  $(".methodSelect").change(e => {
    currentSearchMethod = e.target.value
  })

  $.ajax({
    url: "./bible.json",
     type:"get",
     dataType:'jsonp',  
     success: function(data){
       console.log(data);
     },
     error:function() {
       console.log("err");
     }
 });
})

function updateSearchMethod() {
  $(".methodSelect").empty()
}

// Find a word location list from the index
function searchSingle (key) {
  let min = 0
  let max = index.length
  while (min <= max) {
    let mid = Math.floor((min + max) / 2)
    let comp = key.localeCompare(index[mid][0])
    if (comp === 0) {
      return index[mid][1]
    }
    else if (comp < 0) {
      max = mid - 1
    }
    else {
      min = mid + 1
    }
  }
  return []
}

// Condense a word location list into verse location list, discarding duplicates
function condense (list) {
  let res = []
  list.forEach(elem => {
    if (res.length === 0 || res[res.length - 1] !== (elem >> 8)) {
      res.push(elem >> 8)
    }
  })
  return res
}

// Used on verse location lists
function looseMerge (listA, listB) {
  let res = []
  let i = 0;
  let j = 0;
  while (i < listA.length && j < listB.length) {
    if (listA[i] === listB[j]) {
      res.push(listA[i])
      i++
      j++
    }
    else if (listA[i] < listB[j]) {
      i++
    }
    else {
      j++
    }
  }
  return res;
}

// Used on word location lists
function strictMerge (listA, listB) {
  let res = []
  let i = 0
  let j = 0

  while (i < listA.length && j < listB.length) {
    while(j < listB.length && listB[j] < listA[i] + 1) {
      j++
    }
    if (listB[j] === listA[i] + 1) {
      // We have a match!
      res.push(listB[j])
      j++
    }
    i++
  }

  return res
}

function executeSequentialSearch (searchPhrase) {
  let keys = searchPhrase.split(/\s/)
  console.log(keys)
  results = []
  Object.values(bible).forEach((bookContent, bookIndex) => {
    bookContent.forEach((chapterContent, chapterIndex) => {
      chapterContent.forEach((verse, verseIndex) => {
        for (const key of keys) {
          if (!verse.toLowerCase().includes(key)) {
            return;
          }
        }
        results.push((bookIndex << 16) + (chapterIndex << 8) + (verseIndex))
      })
    })
  })
}

function executeIndexedSearch (searchPhrase) {
  let tokens = searchPhrase.split(/\s*"\s*/)
  console.log(tokens)
  if (tokens.length % 2 === 0) {
    console.log('Invalid quotes')
    return;
  }
  let prelimResultList = []
  tokens.forEach((tk, i) => {
    if (!tk) return;
    let searchKeys = tk.split(/\s|(?=\W)|(?<=-)/)
    console.log(`${i}: [${searchKeys.join('|')}]`)
    if (i % 2 === 0) {
      // Even tokens are outside quotation marks, handle each seperately
      searchKeys.forEach(k => prelimResultList.push(searchSingle(k)))
    }
    else {
      let segmentResult = searchSingle(searchKeys[0])
      for (let i = 1; i < searchKeys.length; i++) {
        segmentResult = strictMerge(segmentResult, searchSingle(searchKeys[i]))
      }
      prelimResultList.push(segmentResult)
    }
  })
  if (prelimResultList.length > 0) {
    results = condense(prelimResultList[0])
    for (let i = 1; i < prelimResultList.length; i++) {
      results = looseMerge(results, condense(prelimResultList[i]))
    }
  }
  else {
    results = []
  }
}

function executeSearch(e, searchPhrase, resetPosition = true) {
  if (!searchPhrase) return;

  if (e) e.preventDefault()
  console.log('SEARCHING: ' + searchPhrase)
  searchPhrase = searchPhrase.toLowerCase()
  
  const startTime = Date.now()
  searchMethods[currentSearchMethod](searchPhrase)
  const elapsed = Date.now() - startTime

  if (resetPosition) {
    page = 0
  }
  resultSkipTo(page)

  const pageLimit = Math.ceil(results.length / pageSize)
  $(".page-item.last>button").html(pageLimit)
  $(".pageInput").attr('max', pageLimit)

  $(".resultCount").html(`${results.length} results found for "${searchPhrase}" using "${currentSearchMethod}" Search (${elapsed} ms elpased).`)
}

function resultSkipTo (newPage) {
  const pageLength = Math.ceil(results.length / pageSize)
  if (pageLength === 0) {
    $(".resultCollection").empty()
    return
  }
  if (newPage < 0 || newPage >= pageLength) {
    return
  }
  page = newPage

  $(".resultCollection").empty()
  for (let i = page * pageSize; i < page * pageSize + pageSize && i < results.length; i++) {
    const bookIndex = results[i] >> 16
    const chpIndex = (results[i] >> 8) & 255
    const verseIndex = results[i] & 255
    const content = bible[chapters[bookIndex]][chpIndex][verseIndex]
    const newElement = $(`<div class="card"><div class="card-body"><h6><a class="card-title" href="./index.html?book=${bookIndex}&chapter=${chpIndex + 1}&verse=${verseIndex + 1}">${chapters[bookIndex]} ${chpIndex + 1}:${verseIndex + 1}</a></h6><p class="card-text">${content}</p></div></div>`)
    newElement.appendTo($(".resultCollection"))
  }

  if (results.length <= pageSize) {
    $(".searchNav").hide()
    return;
  }

  $(".searchNav").show()

  $(".page-item.first").toggle(page > 1)
  $(".page-item.dottedFront").toggle(page > 2)
  $(".page-item.dottedBack").toggle(page < pageLength - 1)
  $(".page-item.last").toggle(page < pageLength)

  $(".page-item.previous").toggleClass('disabled', page === 0)
  $(".page-item.next").toggleClass('disabled', page === pageLength - 1)

  $(".pageInput").val(page + 1)
}