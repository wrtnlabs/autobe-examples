import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_post_restoration_by_community_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account to author the post
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community where moderation will occur
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create moderator account with separate connection
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 4: Assign moderator to the community with appropriate permissions
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 5: Member creates a post in the community (using member connection)
  const postType = "text";
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });

  const postBody = {
    community_id: community.id,
    type: postType,
    title: postTitle,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postBody,
  });
  typia.assert(post);

  // Validate post was created successfully
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post type matches", post.type, postType);

  // Step 6: Moderator removes the post (soft delete)
  await api.functional.redditLike.moderator.posts.erase(moderatorConnection, {
    postId: post.id,
  });

  // Step 7: Moderator restores the post
  const restoredPost = await api.functional.redditLike.moderator.posts.restore(
    moderatorConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(restoredPost);

  // Step 8: Validate restoration - all original metadata should be preserved
  TestValidator.equals(
    "restored post ID matches original",
    restoredPost.id,
    post.id,
  );
  TestValidator.equals(
    "restored post title matches original",
    restoredPost.title,
    post.title,
  );
  TestValidator.equals(
    "restored post type matches original",
    restoredPost.type,
    post.type,
  );
  TestValidator.equals(
    "restored post created_at matches original",
    restoredPost.created_at,
    post.created_at,
  );
  TestValidator.equals(
    "restored post updated_at matches original",
    restoredPost.updated_at,
    post.updated_at,
  );
}
