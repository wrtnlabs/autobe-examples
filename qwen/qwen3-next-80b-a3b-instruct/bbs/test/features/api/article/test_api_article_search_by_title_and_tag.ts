import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_article_search_by_title_and_tag(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://google.com",
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Since no article creation endpoint exists in the provided API SDK,
  // we cannot create test articles. Instead, we'll use search to retrieve
  // any existing articles in the system and test search functionality.
  // Step 2: Retrieve any existing articles to have test data
  // Use search with minimal criteria to get at least one result
  const searchResults =
    await api.functional.economicDiscussion.search.articles.index(
      citizenConnection,
      {
        body: {
          search_term: "", // Empty to get all articles
          tag_filters: undefined,
          sort_order: "desc",
          page: 1,
          limit: 5,
        } satisfies IEconomicDiscussionArticle.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate that we have at least one article to work with
  TestValidator.predicate(
    "at least one article exists in system",
    () => searchResults.data.length > 0,
  );
  // Get the first article's title to test search functionality
  const firstArticleTitle = searchResults.data[0].title;
  // Step 3: Perform search with keyword from actual article title
  // This ensures we'll get results since we know the title exists
  const searchResultsWithKeyword =
    await api.functional.economicDiscussion.search.articles.index(
      citizenConnection,
      {
        body: {
          search_term: firstArticleTitle.substring(
            0,
            Math.min(firstArticleTitle.length, 20),
          ), // Use first 20 chars of title
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionArticle.IRequest,
      },
    );
  typia.assert(searchResultsWithKeyword);
  // Verify we got results with the keyword
  TestValidator.predicate(
    "search returned results with keyword",
    () => searchResultsWithKeyword.data.length > 0,
  );
  // Verify result data structure matches IPageIEconomicDiscussionArticle.ISummary
  for (const article of searchResultsWithKeyword.data) {
    TestValidator.equals("article has title", typeof article.title, "string");
    TestValidator.predicate(
      "title length between 6-200",
      () => article.title.length >= 6 && article.title.length <= 200,
    );
    TestValidator.equals(
      "article has creation time",
      typeof article.created_at,
      "string",
    );
    TestValidator.predicate("creation time is ISO 8601 date-time", () =>
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?(Z|[+-][01][0-9]:[0-5][0-9])$/.test(
        article.created_at,
      ),
    );
    TestValidator.equals("article has author", article.author.id.length, 36);
    TestValidator.equals(
      "article has comment count",
      typeof article.comment_count,
      "number",
    );
    TestValidator.predicate(
      "comment count is non-negative",
      () => article.comment_count >= 0,
    );
    TestValidator.equals("article has tags", Array.isArray(article.tags), true);
    for (const tag of article.tags) {
      TestValidator.equals("tag is string", typeof tag, "string");
      TestValidator.predicate(
        "tag length between 2-50",
        () => tag.length >= 2 && tag.length <= 50,
      );
    }
  }
  // Verify results include articles with the search term in title
  TestValidator.predicate(
    "returned articles contain the search term in title",
    () => {
      const searchTerm = firstArticleTitle.substring(
        0,
        Math.min(firstArticleTitle.length, 20),
      );
      return searchResultsWithKeyword.data.every((article) =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    },
  );
  // Verify articles are sorted by newest first (created_at descending)
  TestValidator.predicate("articles sorted by newest first", () => {
    for (let i = 0; i < searchResultsWithKeyword.data.length - 1; i++) {
      const currentDate = new Date(searchResultsWithKeyword.data[i].created_at);
      const nextDate = new Date(
        searchResultsWithKeyword.data[i + 1].created_at,
      );
      // Current article should be newer than next article
      if (currentDate < nextDate) {
        return false;
      }
    }
    return true;
  });
}
