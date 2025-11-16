import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Test behavior when querying replies to a non-existent parent comment.
 *
 * This test validates the API's error handling when attempting to fetch nested
 * replies for a parent comment that does not exist in the database. It ensures
 * that the endpoint gracefully handles invalid parent comment IDs without
 * exposing system errors and provides appropriate response validation.
 *
 * Test flow:
 *
 * 1. Create an authenticated member for API access
 * 2. Generate a non-existent UUID for a parent comment that was never created
 * 3. Attempt to call PATCH /communityPlatform/comments/{commentId}/comments with
 *    the invalid commentId
 * 4. Verify the response handles the missing parent comment gracefully
 * 5. Validate that error behavior is appropriate (404 or empty results)
 */
export async function test_api_comment_nested_replies_nonexistent_parent(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated member for testing
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Generate a non-existent UUID for a parent comment
  const nonExistentCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to fetch nested replies for non-existent parent comment
  const result: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: nonExistentCommentId,
      body: {
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(result);

  // Step 4 & 5: Validate response structure
  // The API should return a valid paginated response even for non-existent parent
  TestValidator.predicate(
    "response should have pagination structure",
    result.pagination !== undefined && result.data !== undefined,
  );

  TestValidator.predicate(
    "pagination should contain current page number",
    result.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should contain limit value",
    result.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination should contain total records count",
    result.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should contain total pages count",
    result.pagination.pages >= 0,
  );

  // Verify that data array exists (should be empty for non-existent parent)
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(result.data),
  );

  // For a non-existent parent comment, we expect empty results
  TestValidator.equals(
    "nested replies should be empty for non-existent parent comment",
    result.data.length,
    0,
  );
}
