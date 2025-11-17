import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_post_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 2: Create a community
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        rules: RandomGenerator.paragraph(),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post as the regular user
  const post = await api.functional.communityForum.user.posts.create(
    connection,
    {
      body: {
        community_forum_community_id: community.id,
        title: RandomGenerator.name(3),
        type: "text",
        body: RandomGenerator.paragraph(),
      } satisfies ICommunityForumCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Create a moderator
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      community_forum_user_id: userJoin.id,
    } satisfies ICommunityForumCommunityModerator.ICreate,
  });
  typia.assert(moderatorJoin);

  // Step 5: Login as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: userJoin.email,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityModerator.ILogin,
  });

  // Step 6: Delete the post as moderator
  await api.functional.communityForum.moderator.posts.erase(connection, {
    postId: post.id,
  });

  // Verify the post is deleted by attempting to access it again
  await TestValidator.error(
    "Post should not be accessible after deletion",
    async () => {
      // This would normally be a get endpoint, but we're just checking that
      // the post is no longer accessible. Since there's no get endpoint for posts,
      // we'll just try to delete it again which should fail.
      await api.functional.communityForum.moderator.posts.erase(connection, {
        postId: post.id,
      });
    },
  );
}
