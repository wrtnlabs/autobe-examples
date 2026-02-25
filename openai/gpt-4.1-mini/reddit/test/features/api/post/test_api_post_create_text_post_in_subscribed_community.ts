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

export async function test_api_post_create_text_post_in_subscribed_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate user
  const userAuthConnection: api.IConnection = { host: connection.host };
  const authorizedUser: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userAuthConnection, {});
  // Token set internally, userAuthConnection.headers is updated
  // 2. Create a community with the authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = userAuthConnection.headers;
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the user to the community
  // Subscription endpoint is not listed. We create a realistic workaround by assuming the user is automatically subscribed to the community on creation or for test, skip explicit subscription step.
  // 4. Create a text post in the subscribed community
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 5. Validate post details
  TestValidator.predicate(
    "post id exists",
    typeof post.id === "string" && post.id.length > 0,
  );
  TestValidator.equals("post title matches", post.title, postBody.title);
  TestValidator.equals("post type is text", post.postType, "text");
  TestValidator.equals(
    "post content matches",
    (post as any).content,
    postBody.content,
  ); // content might be nested or directly present
  TestValidator.equals(
    "post community id matches",
    post.communityId,
    community.id,
  );
  TestValidator.equals(
    "post author user id matches",
    post.authorUserId ?? null,
    authorizedUser.id,
  );
  TestValidator.equals(
    "post author user matches",
    post.authorUser?.id ?? null,
    authorizedUser.id,
  );
  TestValidator.equals(
    "post author moderator is null",
    post.authorModerator,
    null,
  );
  // 6. Test authorization enforcement
  // Attempt post creation without auth headers
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized post creation", async () => {
    await api.functional.communityPlatform.user.communities.posts.create(
      anonymousConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  });
  // 7. Test subscription enforcement
  // We simulate a connection with an authorized user not subscribed to the community
  // For thorough testing, create another user
  const otherUserAuthConnection: api.IConnection = { host: connection.host };
  const otherAuthorizedUser: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(otherUserAuthConnection, {});
  const otherUserConnection: api.IConnection = { host: connection.host };
  otherUserConnection.headers = otherUserAuthConnection.headers;
  await TestValidator.error("post creation without subscription", async () => {
    await api.functional.communityPlatform.user.communities.posts.create(
      otherUserConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  });
}
