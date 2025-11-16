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

export async function test_api_comment_deletion_nested_reply(
  connection: api.IConnection,
) {
  // 1. Administrator setup - Create category
  const adminMember = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminMember);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Member setup - Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          visibility: "public" as const,
          post_creation_restriction: "open_to_all" as const,
          post_type_restriction: "all_types" as const,
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Create top-level comment
  const topLevelComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(topLevelComment);
  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.community_platform_parent_comment_id,
    null,
  );
  TestValidator.equals(
    "top-level comment nesting depth is 0",
    topLevelComment.nesting_depth,
    0,
  );
  TestValidator.predicate(
    "child_comment_count should be 0 initially",
    topLevelComment.child_comment_count === 0,
  );

  // 6. Create nested reply to top-level comment
  const nestedReply =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: topLevelComment.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(nestedReply);
  TestValidator.equals(
    "nested reply has correct parent",
    nestedReply.community_platform_parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "nested reply nesting depth is 1",
    nestedReply.nesting_depth,
    1,
  );
  TestValidator.predicate(
    "nested reply visibility is visible initially",
    nestedReply.visibility_status === "visible",
  );
  TestValidator.predicate(
    "nested reply is not locked initially",
    nestedReply.is_locked === false,
  );

  // 7. Delete the nested reply
  const deletedComment =
    await api.functional.communityPlatform.member.comments.erase(connection, {
      commentId: nestedReply.id,
    });
  typia.assert(deletedComment);

  // 8. Validate deletion results
  TestValidator.equals(
    "deleted comment has deleted visibility status",
    deletedComment.visibility_status,
    "deleted",
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );
  TestValidator.equals(
    "parent comment reference is preserved",
    deletedComment.community_platform_parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.predicate(
    "thread structure is preserved",
    deletedComment.nesting_depth === 1,
  );
}
