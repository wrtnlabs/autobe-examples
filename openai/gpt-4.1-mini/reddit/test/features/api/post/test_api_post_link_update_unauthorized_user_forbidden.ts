import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
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
import { generate_random_community_platform_user_posts_link_update_post_link } from "../../../generate/generate_random_community_platform_user_posts_link_update_post_link";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_update_unauthorized_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register author user and authorize
  const authorJoinConnection: api.IConnection = { host: connection.host };
  const authorUser = await authorize_user_join(authorJoinConnection, {});
  typia.assert(authorUser);
  // 2. Register unauthorized user and authorize
  const unauthorizedJoinConnection: api.IConnection = { host: connection.host };
  const unauthorizedUser = await authorize_user_join(
    unauthorizedJoinConnection,
    {},
  );
  typia.assert(unauthorizedUser);
  // 3. Author user creates a community
  const authorUserConnection: api.IConnection = { host: connection.host };
  authorUserConnection.headers = {
    Authorization: authorUser.token.access,
  };
  const community =
    await generate_random_community_platform_user_communities_create(
      authorUserConnection,
      {},
    );
  typia.assert(community);
  // 4. Author user creates a link-type post
  const postBody = {
    title: `Link post by ${authorUser.username}`,
    postType: "link",
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      authorUserConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 5. Unauthorized user attempts to update the post's link
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  unauthorizedUserConnection.headers = {
    Authorization: unauthorizedUser.token.access,
  };
  // Prepare update link body
  const updateLinkBody = {
    community_platform_post_id: post.id,
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPostLink.ICreate;
  // Expect 403 Forbidden error
  await TestValidator.httpError(
    "unauthorized user forbidden to update post link",
    403,
    async () => {
      await generate_random_community_platform_user_posts_link_update_post_link(
        unauthorizedUserConnection,
        {
          body: updateLinkBody,
          params: { postId: post.id },
        },
      );
    },
  );
}
