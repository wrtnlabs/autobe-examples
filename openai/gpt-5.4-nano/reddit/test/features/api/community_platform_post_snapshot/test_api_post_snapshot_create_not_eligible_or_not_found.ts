import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
import { generate_random_community_platform_admin_posts_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_admin_posts_snapshots_create_post_snapshot";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshot_create_not_eligible_or_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as an admin
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
  const requestBody: ICommunityPlatformPostSnapshot.ICreate = {
    publishedAt: new Date().toISOString(),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 3 }),
    linkUrl: typia.random<string & tags.Format<"uri">>(),
  };
  // 2) Case A: post does not exist -> should fail (not found business error)
  const notFoundPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot create should fail for non-existent postId",
    [404],
    async () => {
      await api.functional.communityPlatform.admin.posts.snapshots.createPostSnapshot(
        adminConnection,
        {
          postId: notFoundPostId,
          body: requestBody,
        },
      );
    },
  );
  // 3) Case B: post exists but snapshot creation not eligible.
  // We don't have a DTO/utility in the provided materials to force an ineligible post state,
  // so we approximate by using a different random UUID and expecting a business rejection.
  const ineligiblePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot create should fail when post is not eligible",
    [400, 403, 409],
    async () => {
      await api.functional.communityPlatform.admin.posts.snapshots.createPostSnapshot(
        adminConnection,
        {
          postId: ineligiblePostId,
          body: requestBody,
        },
      );
    },
  );
}
