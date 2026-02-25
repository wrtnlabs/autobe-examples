import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function test_api_discussion_board_guest_search_articles_with_text_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the search endpoint for guest users where articles are searched by text and filtered by multiple tags with pagination.
  // Step 1: Guest Join and setup authorized connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoinBody: IDiscussionBoardGuest.IJoin = {
    deviceFingerprint: RandomGenerator.alphaNumeric(16),
    userAgent: "Mozilla/5.0 (compatible; E2E Test)",
    ipAddress: "127.0.0.1",
    anonymousId: RandomGenerator.alphaNumeric(16),
  };
  const guestAuth = await authorize_guest_join(connection, {
    body: guestJoinBody,
  });
  // Update guestConnection headers with authorization token
  guestConnection.headers = { Authorization: guestAuth.token.access };
  // Step 2: Prepare search parameters
  // Generate a random search text
  const searchText = RandomGenerator.substring(
    RandomGenerator.content({ paragraphs: 1 }),
  );
  // Generate random number of tags (between 1 and 5) for filtering
  const tagCount = randint(1, 5);
  // For the demo, generate mock tag UUIDs to simulate tags associated with articles
  const tags = ArrayUtil.repeat(tagCount, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Step 3: Call the guest search articles with text and tags
  const searchBody: IDiscussionBoardArticle.IRequest = {
    search: searchText,
    tags: tags,
    page: 1,
    limit: 10,
    sort: "newest",
  };
  const result =
    await api.functional.discussionBoard.guest.search.articles.index(
      guestConnection,
      { body: searchBody },
    );
  // Step 4: Validate the response structure
  typia.assert(result);
  // Step 5: Assert pagination and data validity
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Step 6: Verify each article matches the search criteria
  for (const article of result.data) {
    // Check title includes search text
    const containsSearchText = article.title.includes(searchText);
    TestValidator.predicate(
      `article ${article.id} contains search text in title`,
      containsSearchText,
    );
    // Check article tags include all the requested tags
    const articleTagIds = article.tags.map((tag) => tag.id);
    const hasAllTags = tags.every((tag) => articleTagIds.includes(tag));
    TestValidator.predicate(
      `article ${article.id} has all filtered tags`,
      hasAllTags,
    );
  }
}
