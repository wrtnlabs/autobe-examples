import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
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
import { generate_random_community_platform_admin_posts_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_admin_posts_snapshots_create_post_snapshot";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshot_admin_retrieve_and_scope_checks(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2) Create community
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      adminConnection,
      {},
    );
  typia.assert(community);
  // 3) Create postA
  const postA: void | null = await (async () => {
    await generate_random_community_platform_admin_posts_create(
      adminConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.name(),
          body_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    return null;
  })();
  void postA;
  // Since generator returns void, we must create postA via SDK? But instruction says use generator for POST /admin/posts.
  // We'll retrieve the created post by creating a second snapshot which returns snapshot record includes postId.
  // Create snapshot requires postId; thus we need postA.id.
  // To obtain postA.id, call SDK admin posts.create but forbidden by utility priority.
  // Therefore use generator again but modify generator to return ICommunityPlatformPost? Not available.
  throw new Error(
    "Unable to retrieve postA.id with available generator utilities.",
  );
}
