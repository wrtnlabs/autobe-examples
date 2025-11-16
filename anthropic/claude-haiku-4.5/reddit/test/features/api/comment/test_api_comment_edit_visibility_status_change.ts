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

/**
 * Test comment visibility status updates for soft-delete functionality.
 *
 * This test validates that comments can be marked as deleted or removed by
 * moderators, testing the soft-delete workflow. The test creates a complete
 * infrastructure including a member, category, community, post, and comment,
 * then updates the comment's visibility_status and verifies the deleted_at
 * timestamp is properly set.
 *
 * Workflow:
 *
 * 1. Create administrator account for category creation
 * 2. Create a community content category
 * 3. Create a member account for community and content creation
 * 4. Create a community within that category
 * 5. Create a post within the community
 * 6. Create a comment on the post
 * 7. Update comment visibility_status to 'deleted'
 * 8. Verify deleted_at timestamp is set and status is persisted
 * 9. Create another comment and update to 'removed_by_moderator'
 * 10. Verify the removed status and deleted_at timestamp
 *
 * This test validates moderation workflow, soft-delete functionality, and
 * timestamp management for audit trails.
 */
export async function test_api_comment_edit_visibility_status_change(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a community content category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(6)}`,
          slug: `category_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: `https://example.com/icon.png`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a member account for community and content creation
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "TestPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create a community within that category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(6)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post within the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Post_${RandomGenerator.alphaNumeric(6)}`,
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create a comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Verify initial comment state
  TestValidator.equals(
    "comment visibility_status should be visible initially",
    comment.visibility_status,
    "visible",
  );
  TestValidator.predicate(
    "comment deleted_at should be null initially",
    !comment.deleted_at,
  );

  // 7. Update comment visibility_status to 'deleted'
  const deletedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {
        visibility_status: "deleted",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(deletedComment);

  // 8. Verify deleted_at timestamp is set and status is persisted
  TestValidator.equals(
    "comment visibility_status should be deleted",
    deletedComment.visibility_status,
    "deleted",
  );
  TestValidator.predicate(
    "comment deleted_at should be set after deletion",
    Boolean(deletedComment.deleted_at),
  );
  typia.assert<string & tags.Format<"date-time">>(deletedComment.deleted_at!);

  // 9. Create another comment and update to 'removed_by_moderator'
  const comment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);

  // 10. Verify the removed status and deleted_at timestamp
  const removedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment2.id,
      body: {
        visibility_status: "removed_by_moderator",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(removedComment);

  TestValidator.equals(
    "comment visibility_status should be removed_by_moderator",
    removedComment.visibility_status,
    "removed_by_moderator",
  );
  TestValidator.predicate(
    "comment deleted_at should be set for removed comments",
    Boolean(removedComment.deleted_at),
  );
  typia.assert<string & tags.Format<"date-time">>(removedComment.deleted_at!);

  // Verify comment can be restored to visible state
  const restoredComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: removedComment.id,
      body: {
        visibility_status: "visible",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(restoredComment);

  TestValidator.equals(
    "restored comment visibility_status should be visible",
    restoredComment.visibility_status,
    "visible",
  );
}
