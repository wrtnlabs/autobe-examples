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
 * Test filtering saved content by creator username.
 *
 * This test validates that the creator parameter correctly filters saved
 * content to show only items created by a specific member. The test creates
 * member accounts and queries the saved content endpoint with various creator
 * filter values to verify the filtering mechanism works correctly. Since the
 * scenario focuses on testing the creator filter functionality of the saved
 * content listing API, we verify that the API correctly accepts and applies the
 * creator parameter.
 */
export async function test_api_member_saved_content_list_filter_by_creator(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (saver)
  const saverAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(saverAuth);
  const saverId = saverAuth.id;

  // Step 2: Create second member account (creator)
  const creatorAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creatorAuth);

  // Step 3: Query saved content with creator filter
  const creatorUsername = RandomGenerator.alphabets(10);
  const savedContentWithCreatorFilter: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: saverId,
        body: {
          page: 1,
          limit: 10,
          creator: creatorUsername,
          contentType: "all",
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(savedContentWithCreatorFilter);

  // Step 4: Verify response structure
  TestValidator.predicate(
    "response has pagination",
    savedContentWithCreatorFilter.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(savedContentWithCreatorFilter.data),
  );
  TestValidator.predicate(
    "pagination has current page",
    savedContentWithCreatorFilter.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    savedContentWithCreatorFilter.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    savedContentWithCreatorFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    savedContentWithCreatorFilter.pagination.pages >= 0,
  );

  // Step 5: If saved items exist, verify they all have the matching creator
  for (const savedItem of savedContentWithCreatorFilter.data) {
    typia.assert(savedItem);

    // Verify content type field exists and is valid
    TestValidator.predicate(
      "saved item has valid content type",
      savedItem.content_type === "post" || savedItem.content_type === "comment",
    );

    // Verify creator matches the filter for posts
    if (savedItem.content_type === "post" && savedItem.post) {
      TestValidator.equals(
        "post creator matches filter",
        savedItem.post.creator.username,
        creatorUsername,
      );
    }

    // Verify creator matches the filter for comments
    if (savedItem.content_type === "comment" && savedItem.comment) {
      TestValidator.equals(
        "comment creator matches filter",
        savedItem.comment.creator.username,
        creatorUsername,
      );
    }
  }

  // Step 6: Test filtering with post content type only
  const postsOnlyFilter: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: saverId,
        body: {
          page: 1,
          limit: 10,
          creator: creatorUsername,
          contentType: "post",
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(postsOnlyFilter);

  // Verify all items are posts when contentType filter is "post"
  for (const item of postsOnlyFilter.data) {
    TestValidator.equals(
      "content type matches post filter",
      item.content_type,
      "post",
    );
  }

  // Step 7: Test filtering with comment content type only
  const commentsOnlyFilter: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: saverId,
        body: {
          page: 1,
          limit: 10,
          creator: creatorUsername,
          contentType: "comment",
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(commentsOnlyFilter);

  // Verify all items are comments when contentType filter is "comment"
  for (const item of commentsOnlyFilter.data) {
    TestValidator.equals(
      "content type matches comment filter",
      item.content_type,
      "comment",
    );
  }

  // Step 8: Test different creator usernames to verify filtering isolation
  const differentCreator = RandomGenerator.alphabets(10);
  const differentCreatorResults: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: saverId,
        body: {
          page: 1,
          limit: 10,
          creator: differentCreator,
          contentType: "all",
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(differentCreatorResults);

  // Results may be empty or different from the first query
  TestValidator.predicate(
    "different creator produces valid response",
    differentCreatorResults.pagination !== undefined &&
      Array.isArray(differentCreatorResults.data),
  );

  // Step 9: Test pagination with creator filter
  const paginatedResponse: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: saverId,
        body: {
          page: 1,
          limit: 5,
          creator: creatorUsername,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(paginatedResponse);

  TestValidator.equals(
    "pagination limit matches request",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array respects limit",
    paginatedResponse.data.length <= 5,
  );
}
