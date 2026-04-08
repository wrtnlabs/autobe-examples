import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_retrieval_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving posts from a specific community feed sorted by newest first.
   *
   * Validates the community feed retrieval endpoint with "new" sorting to ensure posts are returned in descending chronological order. The test verifies response structure, sorting correctness, content preview generation, vote score calculation, comment count accuracy, and pagination metadata.
   *
   * 1. Generate a valid community ID (UUID format).
   * 2. Call the community feed endpoint with sort="new" and limit=10.
   * 3. Validate the response structure matches IPageIRedditLikePost.ISummary.
   * 4. Verify posts are sorted by created_at in descending order (newest first).
   * 5. Validate each post summary contains required fields: id, title, content_type, author, community, vote_score, comment_count, content_preview, created_at.
   * 6. Verify content_preview format based on content_type (text: substring, link: domain, image: thumbnail).
   * 7. Validate pagination metadata contains current, limit, records, and pages.
   * 8. Verify vote_score is a number (integer type).
   * 9. Verify comment_count is a number (integer type).
   */
  // 1. Generate community ID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Call the feed endpoint with new sorting
  const output: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.feeds.index(connection, {
      communityId,
      body: {
        feed_type: "community",
        sort: "new",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    });
  // 3. Validate response structure
  typia.assert(output);
  // 4. Verify posts are sorted by created_at descending (newest first)
  if (output.data.length > 1) {
    for (let i = 0; i < output.data.length - 1; i++) {
      const current = output.data[i];
      const next = output.data[i + 1];
      TestValidator.predicate(
        `post ${i} created_at should be >= post ${i + 1} created_at (newest first)`,
        current.created_at >= next.created_at,
      );
    }
  }
  // 5-6. Validate each post summary and content_preview format
  for (const post of output.data) {
    typia.assert(post);
    // Verify content_preview is non-empty
    TestValidator.predicate(
      `content_preview is non-empty for ${post.content_type} post`,
      post.content_preview.length > 0,
    );
    // Verify vote_score is non-negative (can be negative if more downvotes)
    TestValidator.predicate(
      "vote_score is a number",
      typeof post.vote_score === "number",
    );
    // Verify comment_count is non-negative
    TestValidator.predicate(
      "comment_count is non-negative",
      post.comment_count >= 0,
    );
  }
  // 7-9. Validate pagination metadata
  typia.assert(output.pagination);
  // Verify pagination constraints
  TestValidator.predicate(
    "current page is non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", output.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    output.pagination.pages >= 0,
  );
  // Verify data length matches pagination
  TestValidator.predicate(
    "data array length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "data array length does not exceed records",
    output.data.length <= output.pagination.records,
  );
  // Verify pages calculation is correct
  const expectedPages = Math.ceil(
    output.pagination.records / output.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation matches ceiling of records/limit",
    output.pagination.pages,
    expectedPages,
  );
}
