import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_post_create_link_post_in_subscribed_community(
  connection: api.IConnection,
): Promise<void> {
  // Register and authorize a new user
  const userConnection: api.IConnection = { host: connection.host };
  const user: ICommunityPlatformUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(user);
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: user.token.access,
  };
  // Create a community using utility function
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: `https://example.com/icon/${RandomGenerator.alphabets(6)}.png`,
        },
      },
    );
  typia.assert(community);
  // Subscribe the user to the created community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      { body: { communityCode: community.name } },
    );
  typia.assert(subscription);
  // Prepare valid link post create body
  const validPostBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    postType: "link",
    url: `https://www.${RandomGenerator.alphabets(6)}.com/${RandomGenerator.alphabets(8)}`,
  };
  // Create post with authorized and subscribed user
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      { communityId: community.id, body: validPostBody },
    );
  typia.assert(post);
  // Validate created post properties
  TestValidator.equals("post title matches", post.title, validPostBody.title);
  TestValidator.equals("post type is link", post.postType, "link");
  TestValidator.equals(
    "post community ID matches",
    post.communityId,
    community.id,
  );
  TestValidator.equals(
    "post community name matches",
    post.community.name,
    community.name,
  );
  TestValidator.equals("post author ID matches", post.authorUser?.id, user.id);
  // Negative test: unauthorized user cannot create post
  const blankConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized create post", async () => {
    await api.functional.communityPlatform.user.communities.posts.create(
      blankConnection,
      {
        communityId: community.id,
        body: validPostBody,
      },
    );
  });
  // Negative test: unsubscribed user cannot create post
  // Register a new user who is NOT subscribed
  const unsubscribedConnection: api.IConnection = { host: connection.host };
  const unsubscribedUser: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(unsubscribedConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
  typia.assert(unsubscribedUser);
  unsubscribedConnection.headers = {
    ...unsubscribedConnection.headers,
    Authorization: unsubscribedUser.token.access,
  };
  await TestValidator.error("unsubscribed create post", async () => {
    await api.functional.communityPlatform.user.communities.posts.create(
      unsubscribedConnection,
      {
        communityId: community.id,
        body: validPostBody,
      },
    );
  });
  // Negative test: invalid URL format in link post
  const invalidUrlPostBody = {
    title: "Invalid URL Test",
    postType: "link",
    url: "not-a-valid-url",
  } satisfies ICommunityPlatformPost.ICreate;
  await TestValidator.error("invalid url format", async () => {
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: invalidUrlPostBody,
      },
    );
  });
}
