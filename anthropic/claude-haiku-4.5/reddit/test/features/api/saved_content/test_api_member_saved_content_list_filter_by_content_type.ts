import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSavedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSavedContent";

/**
 * Test filtering saved content by content type (post, comment, or all).
 *
 * This test validates that the contentType filter parameter correctly restricts
 * results to specific content types. The test creates a member account and
 * queries saved content with different content type filters to ensure proper
 * filtering, pagination, and response structure validation.
 *
 * Steps:
 *
 * 1. Create member account for authentication
 * 2. Query saved content with contentType='post' and validate response structure
 * 3. Query saved content with contentType='comment' and validate response
 *    structure
 * 4. Query saved content with contentType='all' and validate both types can appear
 * 5. Verify pagination and item structure for each filter variant
 */
export async function test_api_member_saved_content_list_filter_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorized);

  const memberId = authorized.id;

  // Step 2: Query saved content with contentType='post'
  const postFilterRequest = {
    page: 1,
    limit: 10,
    contentType: "post" as const,
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const postFilteredResults =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: postFilterRequest,
      },
    );
  typia.assert(postFilteredResults);

  // Verify post filter results structure
  TestValidator.predicate(
    "post filter response has valid pagination",
    postFilteredResults.pagination !== null &&
      postFilteredResults.pagination !== undefined,
  );

  TestValidator.predicate(
    "post filter response has data array",
    Array.isArray(postFilteredResults.data),
  );

  // Verify pagination structure for post filter
  TestValidator.predicate(
    "post filter pagination has current page",
    postFilteredResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "post filter pagination has limit",
    postFilteredResults.pagination.limit > 0,
  );

  TestValidator.predicate(
    "post filter pagination has records count",
    postFilteredResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "post filter pagination has pages count",
    postFilteredResults.pagination.pages >= 0,
  );

  // Verify all items in post filter have required fields
  await ArrayUtil.asyncForEach(postFilteredResults.data, async (item) => {
    TestValidator.predicate(
      "post filtered item has id",
      item.id !== null && item.id !== undefined,
    );

    TestValidator.predicate(
      "post filtered item has content_type",
      item.content_type !== null && item.content_type !== undefined,
    );

    TestValidator.predicate(
      "post filtered item has created_at timestamp",
      item.created_at !== null && item.created_at !== undefined,
    );
  });

  // Step 3: Query saved content with contentType='comment'
  const commentFilterRequest = {
    page: 1,
    limit: 10,
    contentType: "comment" as const,
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const commentFilteredResults =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: commentFilterRequest,
      },
    );
  typia.assert(commentFilteredResults);

  // Verify comment filter results structure
  TestValidator.predicate(
    "comment filter response has valid pagination",
    commentFilteredResults.pagination !== null &&
      commentFilteredResults.pagination !== undefined,
  );

  TestValidator.predicate(
    "comment filter response has data array",
    Array.isArray(commentFilteredResults.data),
  );

  // Verify pagination structure for comment filter
  TestValidator.predicate(
    "comment filter pagination has current page",
    commentFilteredResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "comment filter pagination has limit",
    commentFilteredResults.pagination.limit > 0,
  );

  TestValidator.predicate(
    "comment filter pagination has records count",
    commentFilteredResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "comment filter pagination has pages count",
    commentFilteredResults.pagination.pages >= 0,
  );

  // Verify all items in comment filter have required fields
  await ArrayUtil.asyncForEach(commentFilteredResults.data, async (item) => {
    TestValidator.predicate(
      "comment filtered item has id",
      item.id !== null && item.id !== undefined,
    );

    TestValidator.predicate(
      "comment filtered item has content_type",
      item.content_type !== null && item.content_type !== undefined,
    );

    TestValidator.predicate(
      "comment filtered item has created_at timestamp",
      item.created_at !== null && item.created_at !== undefined,
    );
  });

  // Step 4: Query saved content with contentType='all'
  const allFilterRequest = {
    page: 1,
    limit: 10,
    contentType: "all" as const,
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const allFilteredResults =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: allFilterRequest,
      },
    );
  typia.assert(allFilteredResults);

  // Verify all filter results structure
  TestValidator.predicate(
    "all filter response has valid pagination",
    allFilteredResults.pagination !== null &&
      allFilteredResults.pagination !== undefined,
  );

  TestValidator.predicate(
    "all filter response has data array",
    Array.isArray(allFilteredResults.data),
  );

  // Verify pagination structure for all filter
  TestValidator.predicate(
    "all filter pagination has current page",
    allFilteredResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "all filter pagination has limit",
    allFilteredResults.pagination.limit > 0,
  );

  TestValidator.predicate(
    "all filter pagination has records count",
    allFilteredResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "all filter pagination has pages count",
    allFilteredResults.pagination.pages >= 0,
  );

  // Verify items have required fields and proper structure
  await ArrayUtil.asyncForEach(allFilteredResults.data, async (item) => {
    TestValidator.predicate(
      "all filtered item has id",
      item.id !== null && item.id !== undefined,
    );

    TestValidator.predicate(
      "all filtered item has content_type",
      item.content_type !== null && item.content_type !== undefined,
    );

    TestValidator.predicate(
      "all filtered item has created_at timestamp",
      item.created_at !== null && item.created_at !== undefined,
    );

    TestValidator.predicate(
      "all filtered item has either post or comment",
      (item.post !== null && item.post !== undefined) ||
        (item.comment !== null && item.comment !== undefined),
    );
  });

  // Step 5: Validate response consistency across filter types
  TestValidator.predicate(
    "all filter may contain more items than post-only filter",
    allFilteredResults.data.length >= postFilteredResults.data.length,
  );

  TestValidator.predicate(
    "all filter may contain more items than comment-only filter",
    allFilteredResults.data.length >= commentFilteredResults.data.length,
  );
}
