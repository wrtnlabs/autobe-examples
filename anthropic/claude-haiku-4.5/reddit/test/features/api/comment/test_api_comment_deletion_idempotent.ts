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

export async function test_api_comment_deletion_idempotent(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreateBody = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8).toLowerCase(),
    password: "TestPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(member);

  // Step 3: Member creates community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Member creates post
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

  // Step 5: Member creates comment
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.predicate(
    "initial comment should be visible",
    comment.visibility_status === "visible",
  );

  // Step 6: First deletion of comment
  const firstDeletion =
    await api.functional.communityPlatform.member.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(firstDeletion);
  TestValidator.equals(
    "first deletion returns deleted comment",
    firstDeletion.visibility_status,
    "deleted",
  );

  // Step 7: Second deletion attempt - test idempotent behavior
  const secondDeletion =
    await api.functional.communityPlatform.member.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(secondDeletion);
  TestValidator.equals(
    "second deletion maintains deleted state",
    secondDeletion.visibility_status,
    "deleted",
  );

  // Step 8: Verify comment remains deleted after multiple attempts
  TestValidator.equals(
    "comment IDs match across deletions",
    firstDeletion.id,
    secondDeletion.id,
  );
  TestValidator.equals(
    "deleted_at timestamp is set",
    typeof firstDeletion.deleted_at,
    "string",
  );
  TestValidator.equals(
    "deleted_at timestamp persists in second deletion",
    firstDeletion.deleted_at,
    secondDeletion.deleted_at,
  );
}
