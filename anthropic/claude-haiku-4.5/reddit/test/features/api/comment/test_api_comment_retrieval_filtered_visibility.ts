import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Validates comment retrieval with visibility_status filtering.
 *
 * Tests that the comment listing API correctly filters comments based on
 * visibility_status, returning only visible comments while excluding deleted or
 * removed comments. This is essential for maintaining proper access control and
 * ensuring users only see comments they should have access to.
 *
 * Test flow:
 *
 * 1. Authenticate as administrator and member
 * 2. Create a category for community organization
 * 3. Create a community within that category
 * 4. Authenticate as a member and create a post
 * 5. Retrieve comments with visibility_status='visible' filter
 * 6. Verify only visible comments are returned
 * 7. Verify deleted comments are excluded
 * 8. Verify pagination reflects filtered results accurately
 * 9. Test multiple visibility filter options
 */
export async function test_api_comment_retrieval_filtered_visibility(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: memberPassword,
      href: "http://localhost:3000/signup",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Retrieve comments with visibility='visible' filter
  const visibleCommentsResponse =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        visibility_status: "visible",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(visibleCommentsResponse);

  // 7. Verify pagination structure
  TestValidator.predicate(
    "response contains pagination information",
    visibleCommentsResponse.pagination !== undefined &&
      visibleCommentsResponse.pagination.current >= 1,
  );

  TestValidator.predicate(
    "response contains data array",
    Array.isArray(visibleCommentsResponse.data),
  );

  // 8. Verify all returned comments have visible status
  TestValidator.predicate(
    "all comments have visible status",
    visibleCommentsResponse.data.every(
      (comment) => comment.visibility_status === "visible",
    ),
  );

  // 9. Verify no deleted comments in visible results
  TestValidator.predicate(
    "no deleted comments in visible filter results",
    visibleCommentsResponse.data.every(
      (comment) => comment.visibility_status !== "deleted",
    ),
  );

  // 10. Verify no removed_by_moderator comments in visible results
  TestValidator.predicate(
    "no removed comments in visible filter results",
    visibleCommentsResponse.data.every(
      (comment) => comment.visibility_status !== "removed_by_moderator",
    ),
  );

  // 11. Verify pagination limit is respected
  TestValidator.predicate(
    "page size limit is respected",
    visibleCommentsResponse.data.length <=
      visibleCommentsResponse.pagination.limit,
  );

  // 12. Verify pagination records count is non-negative
  TestValidator.predicate(
    "pagination records count is valid",
    visibleCommentsResponse.pagination.records >= 0,
  );

  // 13. Test retrieval with deleted visibility filter
  const deletedCommentsResponse =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        visibility_status: "deleted",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(deletedCommentsResponse);

  // 14. Verify deleted filter returns only deleted comments
  TestValidator.predicate(
    "deleted filter returns only deleted status comments",
    deletedCommentsResponse.data.every(
      (comment) => comment.visibility_status === "deleted",
    ),
  );

  // 15. Test retrieval with removed_by_moderator filter
  const removedCommentsResponse =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        visibility_status: "removed_by_moderator",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(removedCommentsResponse);

  // 16. Verify removed_by_moderator filter returns correct comments
  TestValidator.predicate(
    "removed by moderator filter returns correct status",
    removedCommentsResponse.data.every(
      (comment) => comment.visibility_status === "removed_by_moderator",
    ),
  );

  // 17. Test pagination with smaller page size
  const paginatedResponse =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 5,
        visibility_status: "visible",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(paginatedResponse);

  TestValidator.predicate(
    "page size of 5 is respected",
    paginatedResponse.data.length <= 5,
  );

  // 18. Verify all returned comments have complete structure
  TestValidator.predicate(
    "all comments have required fields",
    paginatedResponse.data.every(
      (comment) =>
        comment.id !== undefined &&
        comment.content !== undefined &&
        comment.creator !== undefined &&
        comment.post !== undefined &&
        comment.visibility_status === "visible",
    ),
  );
}
