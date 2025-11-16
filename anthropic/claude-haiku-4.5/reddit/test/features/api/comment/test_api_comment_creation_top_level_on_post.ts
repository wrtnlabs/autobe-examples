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

export async function test_api_comment_creation_top_level_on_post(
  connection: api.IConnection,
) {
  // 1. Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminCreated = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminCreated);

  // 2. Create a category
  const categoryCreated =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryCreated);

  // 3. Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const memberCreated = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberCreated);

  // 4. Create a community
  const communityCreated =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categoryCreated.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreated);

  // 5. Create a post in the community
  const postCreated =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: communityCreated.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postCreated);

  // 6. Create a top-level comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });
  const commentCreated =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: postCreated.id,
        content: commentContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(commentCreated);

  // 7. Validate all comment properties
  TestValidator.equals(
    "comment post_id matches",
    commentCreated.community_platform_post_id,
    postCreated.id,
  );
  TestValidator.predicate(
    "parent_comment_id is null for top-level",
    commentCreated.community_platform_parent_comment_id === null ||
      commentCreated.community_platform_parent_comment_id === undefined,
  );
  TestValidator.equals("nesting_depth is 0", commentCreated.nesting_depth, 0);
  TestValidator.equals(
    "content matches input",
    commentCreated.content,
    commentContent,
  );
  TestValidator.equals(
    "vote_score initialized to 0",
    commentCreated.vote_score,
    0,
  );
  TestValidator.equals(
    "upvote_count initialized to 0",
    commentCreated.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote_count initialized to 0",
    commentCreated.downvote_count,
    0,
  );
  TestValidator.equals(
    "child_comment_count initialized to 0",
    commentCreated.child_comment_count,
    0,
  );
  TestValidator.equals(
    "visibility_status is visible",
    commentCreated.visibility_status,
    "visible",
  );
  TestValidator.predicate(
    "is_locked is false",
    commentCreated.is_locked === false,
  );
  TestValidator.predicate(
    "created_at is set",
    commentCreated.created_at !== null &&
      commentCreated.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    commentCreated.updated_at !== null &&
      commentCreated.updated_at !== undefined,
  );
  TestValidator.predicate(
    "creator is present",
    commentCreated.creator !== null && commentCreated.creator !== undefined,
  );
  TestValidator.predicate(
    "post summary is present",
    commentCreated.post !== null && commentCreated.post !== undefined,
  );
  TestValidator.equals(
    "post summary id matches",
    commentCreated.post.id,
    postCreated.id,
  );
  TestValidator.equals(
    "post summary title matches",
    commentCreated.post.title,
    postCreated.title,
  );
}
