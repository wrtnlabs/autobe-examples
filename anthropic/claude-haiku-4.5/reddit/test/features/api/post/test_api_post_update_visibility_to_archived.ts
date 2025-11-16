import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_update_visibility_to_archived(
  connection: api.IConnection,
) {
  // Step 1: Create a category by administrator
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Admin@Password123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member joins platform
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member@Password123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a public post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Verify initial state
  TestValidator.equals(
    "initial visibility is public",
    post.visibility_status,
    "public",
  );

  // Step 5: Update post visibility to archived
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        visibility_status: "archived",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 6: Validate visibility change
  TestValidator.equals(
    "post visibility changed to archived",
    updatedPost.visibility_status,
    "archived",
  );

  // Step 7: Verify post data integrity after archiving
  TestValidator.equals(
    "title preserved after archiving",
    updatedPost.title,
    post.title,
  );
  TestValidator.equals(
    "content preserved after archiving",
    updatedPost.content_text,
    post.content_text,
  );
  TestValidator.equals(
    "creator preserved after archiving",
    updatedPost.creator.id,
    post.creator.id,
  );
  TestValidator.equals(
    "community preserved after archiving",
    updatedPost.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "nsfw flag preserved",
    updatedPost.is_nsfw,
    post.is_nsfw,
  );
  TestValidator.equals(
    "spoiler flag preserved",
    updatedPost.has_spoiler,
    post.has_spoiler,
  );

  // Step 8: Verify engagement metrics
  TestValidator.equals("vote score remains zero", updatedPost.vote_score, 0);
  TestValidator.equals(
    "upvote count remains zero",
    updatedPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote count remains zero",
    updatedPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment count remains zero",
    updatedPost.comment_count,
    0,
  );

  // Step 9: Verify timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    updatedPost.created_at !== null && updatedPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedPost.updated_at !== null && updatedPost.updated_at !== undefined,
  );
}
