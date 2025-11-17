import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityPost";

export async function test_api_user_posts_retrieval_by_other_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (post author)
  const user1Join = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create a community for posts
  const communityCreate = {
    name: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "_"),
    slug:
      RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_") + Date.now(),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph(),
    rules: RandomGenerator.paragraph(),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create posts for the first user
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(4),
    type: "text",
    body: RandomGenerator.paragraph(),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Create second user (post retriever)
  const user2Join = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Step 5: Retrieve posts created by first user using second user's connection
  const posts: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.users.posts.index(connection, {
      username: user1.username,
      body: {},
    });
  typia.assert(posts);

  // Validate that we can retrieve the posts
  TestValidator.predicate(
    "posts should be retrieved successfully",
    () => posts.data.length > 0,
  );

  TestValidator.equals(
    "retrieved post should match created post",
    posts.data[0].id,
    post.id,
  );

  TestValidator.equals(
    "post author should match",
    posts.data[0].community_forum_user_id,
    user1.id,
  );
}
