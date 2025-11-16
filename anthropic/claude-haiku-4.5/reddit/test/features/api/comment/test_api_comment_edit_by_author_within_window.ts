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

export async function test_api_comment_edit_by_author_within_window(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community and post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create a comment on the post
  const originalContent = RandomGenerator.content({ paragraphs: 1 });
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: null,
        content: originalContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 7: Verify original comment content and timestamps
  const originalUpdatedAt = comment.updated_at;
  TestValidator.equals(
    "comment content matches original",
    comment.content,
    originalContent,
  );

  // Step 8: Edit the comment with new content within 24-hour window
  const editedContent = RandomGenerator.content({ paragraphs: 1 });
  const editedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {
        content: editedContent,
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(editedComment);

  // Step 9: Verify the edited content is saved
  TestValidator.equals(
    "edited comment content matches new content",
    editedComment.content,
    editedContent,
  );

  // Step 10: Verify that updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at timestamp should change after edit",
    editedComment.updated_at,
    originalUpdatedAt,
  );

  // Step 11: Verify visibility status remains visible
  TestValidator.equals(
    "comment visibility status should remain visible",
    editedComment.visibility_status,
    "visible",
  );

  // Step 12: Verify comment ID remains the same
  TestValidator.equals(
    "comment ID should not change after edit",
    editedComment.id,
    comment.id,
  );
}
