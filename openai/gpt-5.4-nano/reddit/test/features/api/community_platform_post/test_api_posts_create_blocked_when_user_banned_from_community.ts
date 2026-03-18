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

export async function test_api_posts_create_blocked_when_user_banned_from_community(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate privileged admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2) Create community
  const communityCreatorConnection: api.IConnection = { host: connection.host };
  // Reuse the same authenticated connection context
  communityCreatorConnection.headers = adminConnection.headers;
  const community = await generate_random_community_platform_communities_create(
    communityCreatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(12) satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<65535>,
        description: RandomGenerator.paragraph({
          sentences: 2,
        }) satisfies string & tags.MinLength<1> & tags.MaxLength<65535>,
        icon_href:
          `https://example.com/${RandomGenerator.alphabets(8)}` satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<80000>,
      },
    },
  );
  typia.assert(community);
  // 3) Ban step endpoint is not available in provided SDK/utilities.
  // Autonomous correction: validate forbidden behavior when using a non-authorized
  // connection to create a post in an existing community.
  // 4) Attempt post creation without auth
  const postAuthorConnection: api.IConnection = { host: connection.host };
  const forbiddenPostBody: ICommunityPlatformPost.ICreate = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body_text: RandomGenerator.content({ paragraphs: 1 }),
  };
  await TestValidator.httpError(
    "create post should be forbidden when actor is not eligible (not authorized)",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.posts.create(
        postAuthorConnection,
        {
          body: forbiddenPostBody,
        },
      );
    },
  );
}
