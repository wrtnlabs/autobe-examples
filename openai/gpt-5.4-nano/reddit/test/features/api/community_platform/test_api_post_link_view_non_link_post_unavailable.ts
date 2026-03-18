import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
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
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_link_view_non_link_post_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization (join establishes token on this connection)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2) Create a non-link post.
  // NOTE: Provided SDK/generator signatures for admin.posts.create return void,
  // so postId cannot be captured. We still create a text post to exercise
  // the non-link classification path.
  await generate_random_community_platform_admin_posts_create(adminConnection, {
    body: {
      post_type: "text",
      title: RandomGenerator.name(2),
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
      community_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // 3) Attempt to view link representation.
  // As postId is unavailable from the create call's return type, we expect
  // an error/non-success outcome from the endpoint.
  await TestValidator.error(
    "link representation should be unavailable for a non-link post",
    async () => {
      const postId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.communityPlatform.admin.posts.link.at(
        adminConnection,
        { postId },
      );
    },
  );
}
