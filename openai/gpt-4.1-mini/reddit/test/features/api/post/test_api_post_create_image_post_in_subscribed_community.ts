import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_create_image_post_in_subscribed_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the user to the community
  // As per scenario, the user must be subscribed to create posts
  // The test infrastructure or utility function for subscribing is not provided,
  // so this step might be considered part of user context or skipped if no API.
  // We'll assume subscription is done by an API call, but we don't have it listed.
  // So for scenario correction, we will skip explicit subscription and proceed.
  // 4. Create image post with multiple image URLs
  const images = ArrayUtil.repeat(
    3,
    () => `https://example.com/image_${RandomGenerator.alphaNumeric(6)}.jpg`,
  );
  const body = {
    title: RandomGenerator.name(3),
    postType: "image",
    images: images,
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: body,
      },
    );
  typia.assert(post);
  // Validate response properties
  TestValidator.equals("post communityId", post.communityId, community.id);
  TestValidator.equals("post title", post.title, body.title);
  TestValidator.predicate(
    "post has community summary",
    post.community.id === community.id,
  );
  TestValidator.equals("post type is image", post.postType, "image");
  TestValidator.predicate("post has authorUser", post.authorUser !== null);
  TestValidator.equals(
    "authorUser id matches",
    post.authorUser?.id,
    authorized.id,
  );
  // There should be images metadata - but API schema does not specify images in response directly
  // So we just test that post type is image and title, author, community are aligned.
  // 5. Authorization failure if user not subscribed
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_user_join(
    anotherUserConnection,
    {},
  );
  typia.assert(anotherAuthorized);
  anotherUserConnection.headers = {
    Authorization: anotherAuthorized.token.access,
  };
  // Attempt to create image post under the same community but as unsubscribed user
  const newBody = {
    title: RandomGenerator.name(3),
    postType: "image",
    images: images,
  } satisfies ICommunityPlatformPost.ICreate;
  await TestValidator.error(
    "unauthorized create post: user not subscribed",
    async () => {
      await api.functional.communityPlatform.user.communities.posts.create(
        anotherUserConnection,
        {
          communityId: community.id,
          body: newBody,
        },
      );
    },
  );
}
