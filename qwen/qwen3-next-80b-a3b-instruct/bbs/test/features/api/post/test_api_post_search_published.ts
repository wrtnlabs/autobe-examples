import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

/**
 * Test searching and retrieving a paginated list of published economic
 * discussion posts.
 *
 * This test validates that the system correctly filters posts by
 * status='published', returns results sorted by creation date (newest first),
 * and applies pagination with consistent data structure. The test ensures only
 * visible content is returned and moderation status is properly respected by
 * creating test data and verifying the search results meet all requirements.
 *
 * 1. Authenticate member to create test data
 * 2. Create a topic to associate with posts
 * 3. Create a published post
 * 4. Search for published posts with validation
 * 5. Verify pagination, sorting, and response structure
 */
export async function test_api_post_search_published(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to create test data
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic to associate with a post
  const topicName:
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy" = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: "Discussion about economic inflation trends and impacts.",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a published post that can be retrieved in the search results
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 7,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("post status is published", post.status, "published");
  TestValidator.equals(
    "post topic matches created topic",
    post.economic_board_topics_id,
    topic.id,
  );

  // Step 4: Search for published posts with validation
  const searchResponse: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "published",
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(searchResponse);

  // Step 5: Verify pagination, sorting, and response structure
  TestValidator.equals(
    "pagination has correct page",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination has correct records",
    searchResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination has correct pages",
    searchResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "data array has expected length",
    searchResponse.data.length,
    1,
  );
  TestValidator.equals(
    "first post has correct id",
    searchResponse.data[0].id,
    post.id,
  );
  TestValidator.equals(
    "first post has correct status",
    searchResponse.data[0].status,
    "published",
  );
  TestValidator.equals(
    "first post has correct topic",
    searchResponse.data[0].economic_board_topics_id,
    topic.id,
  );
  TestValidator.equals(
    "first post subject matches",
    searchResponse.data[0].subject,
    post.subject,
  );
  TestValidator.equals(
    "first post content matches",
    searchResponse.data[0].content,
    post.content,
  );
}
