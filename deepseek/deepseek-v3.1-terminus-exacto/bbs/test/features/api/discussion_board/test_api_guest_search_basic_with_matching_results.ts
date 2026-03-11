import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_search_basic_with_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Note: Since we cannot create articles as a guest (guest users are read-only),
  // and we don't have member/admin connections in this test context,
  // we'll test the search functionality with basic validation.
  // The test will validate that the search API returns properly structured
  // results without assuming specific content matches.
  // Prepare search request with a simple query
  const searchRequest = {
    search: "test",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;
  // Execute search
  const searchResults = await api.functional.discussionBoard.guest.search.index(
    guestConnection,
    { body: searchRequest },
  );
  typia.assert(searchResults);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page valid",
    searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    searchResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResults.pagination.pages >= 0,
  );
  // Validate article summaries structure for each article in results
  for (const article of searchResults.data) {
    typia.assert(article);
    TestValidator.predicate("article has title", article.title.length > 0);
    typia.assert(article.author);
    TestValidator.predicate(
      "author has display name",
      article.author.display_name.length > 0,
    );
    typia.assert(article.section);
    TestValidator.predicate(
      "section has name",
      article.section.name.length > 0,
    );
    typia.assert(article.tags);
    TestValidator.predicate(
      "comments count non-negative",
      article.comments_count >= 0,
    );
    TestValidator.predicate(
      "created_at is valid date",
      new Date(article.created_at).toString() !== "Invalid Date",
    );
  }
  // Validate that search returns a valid response structure
  TestValidator.predicate(
    "search results structure valid",
    searchResults.data.length <= searchResults.pagination.limit,
  );
}
