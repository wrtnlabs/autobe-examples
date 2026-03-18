import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { generate_random_community_platform_admin_posts_votes_create } from "../../../generate/generate_random_community_platform_admin_posts_votes_create";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_rejects_when_post_target_not_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  await TestValidator.error(
    "admin join fallback if login creds invalid",
    async () => {
      await authorize_admin_login(adminConnection, {
        body: {
          email: adminCredentials.email,
          password: adminCredentials.password,
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
    },
  ).catch(async () => {
    await authorize_admin_join(adminConnection, { body: adminCredentials });
  });
  // 2) Create community
  const communityConnection: api.IConnection = { host: connection.host };
  // Reuse admin auth headers already on adminConnection by sharing host only is not enough.
  // Create actor-specific connection from adminConnection so headers persist.
  communityConnection.headers = adminConnection.headers;
  const community = await api.functional.communityPlatform.communities.create(
    communityConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: (typia.random<string>() satisfies
          | (string & tags.MinLength<1> & tags.MaxLength<80000>)),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Create post (admin posts create)
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = adminConnection.headers;
  const postType = "text";
  const postCreateBody = {
    community_id: community.id,
    post_type: postType,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const createdPostBefore = (await api.functional.communityPlatform.admin.posts
    .create) as unknown;
  await api.functional.communityPlatform.admin.posts.create(postConnection, {
    body: postCreateBody,
  });
  // We have no postId return type for create (SDK returns void). Use generation helper is not allowed.
  // So we must create a postId by separately generating post. But only generation utility exists and returns void too.
  // Since no view/list endpoint exists, we cannot obtain postId. Therefore cannot continue.
  throw new Error(
    "Cannot determine postId: admin.posts.create returns void and no retrieval/list endpoints are provided in inputs.",
  );
}
