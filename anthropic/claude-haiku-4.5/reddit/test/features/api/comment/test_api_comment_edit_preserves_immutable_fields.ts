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

export async function test_api_comment_edit_preserves_immutable_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and set up category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "MemberPassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create a comment on the post
  const originalComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(originalComment);

  // Store immutable field values for later verification
  const originalId = originalComment.id;
  const originalCreatedAt = originalComment.created_at;
  const originalNestingDepth = originalComment.nesting_depth;
  const originalPostId = originalComment.community_platform_post_id;
  const originalParentCommentId =
    originalComment.community_platform_parent_comment_id;

  // Step 7: Update the comment content (allowed operation)
  const newContent = RandomGenerator.paragraph();
  const updatedComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: originalComment.id,
      body: {
        content: newContent,
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(updatedComment);

  // Step 8: Verify immutable fields remain unchanged
  TestValidator.equals(
    "comment id should not change",
    updatedComment.id,
    originalId,
  );
  TestValidator.equals(
    "created_at timestamp should not change",
    updatedComment.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "nesting_depth should not change",
    updatedComment.nesting_depth,
    originalNestingDepth,
  );
  TestValidator.equals(
    "post_id should not change",
    updatedComment.community_platform_post_id,
    originalPostId,
  );
  TestValidator.equals(
    "parent_comment_id should not change",
    updatedComment.community_platform_parent_comment_id,
    originalParentCommentId,
  );

  // Step 9: Verify that mutable fields were actually updated
  TestValidator.equals(
    "content should be updated",
    updatedComment.content,
    newContent,
  );

  // Step 10: Test updating visibility_status (also mutable)
  const updatedWithStatus =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: originalComment.id,
      body: {
        visibility_status: "deleted",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(updatedWithStatus);

  // Verify immutable fields still unchanged after second update
  TestValidator.equals(
    "comment id should still not change after second update",
    updatedWithStatus.id,
    originalId,
  );
  TestValidator.equals(
    "created_at should still not change after second update",
    updatedWithStatus.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "nesting_depth should still not change after second update",
    updatedWithStatus.nesting_depth,
    originalNestingDepth,
  );

  // Verify mutable field was updated
  TestValidator.equals(
    "visibility_status should be updated",
    updatedWithStatus.visibility_status,
    "deleted",
  );
}
