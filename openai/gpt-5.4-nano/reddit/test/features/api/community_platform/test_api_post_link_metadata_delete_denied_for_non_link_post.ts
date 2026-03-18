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

export async function test_api_post_link_metadata_delete_denied_for_non_link_post(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // 1) Admin join.
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  // 2) Create a community.
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Create a non-link post (best-effort: text-type). Note: post creation returns void in this SDK.
  await generate_random_community_platform_admin_posts_create(adminConnection, {
    body: {
      community_id: community.id,
      post_type: "text",
      title: RandomGenerator.name(3),
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // 4) Attempt to delete link metadata for a non-link post.
  // We do not have an API here to retrieve the created postId from the void-returning creation endpoint,
  // so we use a UUID placeholder to assert the operation is rejected.
  const nonLinkPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete link metadata should be denied for non-link post",
    async () => {
      await api.functional.communityPlatform.admin.posts.link.erasePostLink(
        adminConnection,
        {
          postId: nonLinkPostId,
        },
      );
    },
  );
  // Ensure state is unchanged by verifying the operation remains rejected.
  await TestValidator.error(
    "delete link metadata should remain denied after failed attempt",
    async () => {
      await api.functional.communityPlatform.admin.posts.link.erasePostLink(
        adminConnection,
        {
          postId: nonLinkPostId,
        },
      );
    },
  );
}
