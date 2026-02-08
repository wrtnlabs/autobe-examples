import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_banned_users_create } from "../../../generate/generate_random_community_platform_admin_banned_users_create";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";

/**
 * Test updating a banned user record by removing the unbanned_at timestamp (setting it to null) to keep the user banned, but changing the reason.
 * Steps:
 * 1) Admin joins the platform.
 * 2) Create a ban record for the user.
 * 3) Admin updates the ban record with unbanned_at set to null and modifies the reason.
 * 4) Ensure the user remains banned by verifying unbanned_at is null in the response.
 * 5) Confirm admin authorization is required and enforced.
 */
export async function test_api_community_platform_admin_banned_users_update_keep_banned_with_reason_change(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin joins the platform
  const adminConnection: IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {} satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2) Create ban record for the user
  const banRecordRaw =
    await generate_random_community_platform_admin_banned_users_create(
      adminConnection,
      {
        body: {
          unbanned_at: null,
          reason: "initial ban reason",
        },
      },
    );
  // Assert as a partial object with properties used
  const banRecord = typia.assert<{
    id: number;
    unbanned_at: string | null;
    reason: string;
  }>(banRecordRaw);
  // 3) Admin updates the ban record with unbanned_at = null and modifies reason
  const updatedBanReason = "updated ban reason";
  const updateBody: ICommunityPlatformBannedUser.IUpdate = {
    unbanned_at: null,
    reason: updatedBanReason,
  };
  const updatedBanRecordRaw =
    await api.functional.communityPlatform.admin.bannedUsers.update(
      adminConnection,
      {
        bannedUserId: String(banRecord.id),
        body: updateBody,
      },
    );
  const updatedBanRecord = typia.assert<{
    id: number;
    unbanned_at: string | null;
    reason: string;
  }>(updatedBanRecordRaw);
  // 4) Verify unbanned_at is null in the response
  TestValidator.equals(
    "unbanned_at remains null",
    updatedBanRecord.unbanned_at,
    null,
  );
  // 5) Verify reason is updated
  TestValidator.equals(
    "ban reason updated",
    updatedBanRecord.reason,
    updatedBanReason,
  );
  // 6) Verify admin authorization enforced - try without auth
  const unauthorizedConnection: IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update attempt",
    401,
    async () => {
      await api.functional.communityPlatform.admin.bannedUsers.update(
        unauthorizedConnection,
        {
          bannedUserId: String(banRecord.id),
          body: updateBody,
        },
      );
    },
  );
}
