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

export async function test_api_comment_retrieval_deleted_comment(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Create comment on the post
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
    "initial visibility_status is visible",
    comment.visibility_status,
    "visible",
  );
  TestValidator.equals("initial deleted_at is null", comment.deleted_at, null);

  // Update comment to deleted state
  const deletedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {
        visibility_status: "deleted",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(deletedComment);

  // Verify deletion transition
  TestValidator.equals(
    "visibility_status changed to deleted",
    deletedComment.visibility_status,
    "deleted",
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  // Retrieve the deleted comment by ID
  const retrievedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.comments.at(connection, {
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Verify soft-delete preservation - comment still exists in database
  TestValidator.equals(
    "retrieved comment ID matches",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "retrieved visibility_status is deleted",
    retrievedComment.visibility_status,
    "deleted",
  );
  TestValidator.predicate(
    "retrieved deleted_at is set",
    retrievedComment.deleted_at !== null &&
      retrievedComment.deleted_at !== undefined,
  );

  // Verify audit trail - content remains unchanged
  TestValidator.equals(
    "content preserved after deletion",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "creator preserved after deletion",
    retrievedComment.creator.id,
    comment.creator.id,
  );

  // Verify creation timestamp unchanged
  TestValidator.equals(
    "created_at unchanged",
    retrievedComment.created_at,
    comment.created_at,
  );
}
