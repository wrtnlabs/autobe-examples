import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_platform_admin_community_bans_create_optional_fields_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {},
    });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Ban user with all optional fields filled
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const now = new Date();
  const bannedAtISO = now.toISOString();
  const unbannedAtDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour in future
  const unbannedAtISO = unbannedAtDate.toISOString();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const banCreateBody: any = {
    userId: typia.random<string & tags.Format<"uuid">>(),
    bannedAt: bannedAtISO,
    unbannedAt: unbannedAtISO,
    reason: reason,
  };
  const banRecord: any =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        body: banCreateBody,
        params: { communityId },
      },
    );
  typia.assert(banRecord);
  // 3. Confirm returned ban record fields
  TestValidator.equals("userId", banRecord.userId, banCreateBody.userId);
  TestValidator.equals("communityId", banRecord.communityId, communityId);
  TestValidator.equals("bannedAt", banRecord.bannedAt, banCreateBody.bannedAt);
  TestValidator.equals(
    "unbannedAt",
    banRecord.unbannedAt,
    banCreateBody.unbannedAt,
  );
  TestValidator.equals("reason", banRecord.reason, banCreateBody.reason);
  // Check audit properties exist and types
  TestValidator.predicate(
    "createdAt exists",
    typeof banRecord.createdAt === "string" && banRecord.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt exists",
    typeof banRecord.updatedAt === "string" && banRecord.updatedAt.length > 0,
  );
  // Soft delete field check
  TestValidator.predicate(
    "deletedAt is null or string",
    banRecord.deletedAt === null || typeof banRecord.deletedAt === "string",
  );
  // 4. Verify unban timestamp enforcement
  await TestValidator.error(
    "prevent ban during unbannedAt period",
    async () => {
      await generate_random_community_platform_admin_communities_bans_create(
        adminConnection,
        {
          body: banCreateBody,
          params: { communityId },
        },
      );
    },
  );
}
