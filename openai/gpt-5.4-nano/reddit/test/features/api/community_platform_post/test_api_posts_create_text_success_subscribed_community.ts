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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_posts_create_text_success_subscribed_community(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate privileged admin via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2) Create a community (owner/subscription context)
  const memberConnection: api.IConnection = { host: connection.host };
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphaNumeric(12)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: typia.random<string & tags.MinLength<1> & tags.MaxLength<80000>>(),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);

  // 3) Create a text post in that community
  const title = `post-${RandomGenerator.alphaNumeric(10)}`;
  const bodyText = RandomGenerator.paragraph({ sentences: 3 });
  await api.functional.communityPlatform.admin.posts.create(adminConnection, {
    body: {
      community_id: community.id,
      post_type: "text",
      title,
      body_text: bodyText,
    } satisfies ICommunityPlatformPost.ICreate,
  });

  TestValidator.predicate("text post creation should succeed", () => true);
}
