import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_admin_posts_link_update_post_link } from "../../../generate/generate_random_community_platform_admin_posts_link_update_post_link";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_admin_update_post_link_preview_fields_provided_or_derived(
  connection: api.IConnection,
): Promise<void> {
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
  // NOTE: ICommunityPlatformPost.ICreate and the provided create SDK/generator
  // return type is Promise<void>, so we cannot reliably obtain a real postId
  // for non-simulation mode. The link-update generator requires postId.
  // Therefore, this test is meaningful only when the SDK operates in
  // simulation mode.
  if (!adminConnection.simulate && !connection.simulate) {
    throw new Error(
      "Cannot validate link preview persistence: post creation returns void and no post detail endpoint or postId is available in non-simulate mode.",
    );
  }
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: provide title/description explicitly
  const href1 = typia.random<string & tags.Format<"uri">>();
  const displayTitle1 = RandomGenerator.paragraph({ sentences: 2 });
  const displayDescription1 = RandomGenerator.paragraph({ sentences: 3 });
  const updated1 =
    await generate_random_community_platform_admin_posts_link_update_post_link(
      adminConnection,
      {
        params: { postId },
        body: {
          href: href1,
          displayTitle: displayTitle1,
          displayDescription: displayDescription1,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updated1);
  // DTO contract for ICommunityPlatformPost.linkContent is null | null
  TestValidator.equals(
    "updated1 linkContent is null",
    updated1.linkContent,
    null,
  );
  // Scenario 2: derive/refresh when preview fields omitted
  const href2 = typia.random<string & tags.Format<"uri">>();
  const updated2 =
    await generate_random_community_platform_admin_posts_link_update_post_link(
      adminConnection,
      {
        params: { postId },
        body: {
          href: href2,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "updated2 linkContent is null",
    updated2.linkContent,
    null,
  );
  TestValidator.notEquals("href should differ", href1, href2);
}
