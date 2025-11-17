import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_create_link_post(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    slug: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create a link post
  const linkPostCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(5),
    type: "link",
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: `https://${RandomGenerator.alphabets(10)}.com/${RandomGenerator.alphabets(5)}`,
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: linkPostCreate,
    });
  typia.assert(post);

  // Step 4: Validate the created post
  TestValidator.equals("post title matches", post.title, linkPostCreate.title);
  TestValidator.equals("post type is link", post.type, "link");
  TestValidator.equals("post url matches", post.url, linkPostCreate.url);
  TestValidator.equals(
    "post community id matches",
    post.community_forum_community_id,
    community.id,
  );
  TestValidator.equals(
    "post author id matches",
    post.community_forum_user_id,
    user.id,
  );
  TestValidator.equals("post body matches", post.body, linkPostCreate.body);
  TestValidator.predicate(
    "post has valid created_at timestamp",
    () => new Date(post.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "post has valid updated_at timestamp",
    () => new Date(post.updated_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "post created_at equals updated_at for new post",
    () => post.created_at === post.updated_at,
  );
}
