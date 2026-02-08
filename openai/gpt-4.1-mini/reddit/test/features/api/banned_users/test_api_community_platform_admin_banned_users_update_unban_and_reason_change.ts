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
 * Test updating a banned user's ban record by a community admin with valid data. This includes changing the ban reason and setting the unbanned_at timestamp to lift the ban.
 * Steps:
 * 1) Admin joins the platform.
 * 2) A ban record for a user is created via POST /communityPlatform/admin/bannedUsers.
 * 3) Admin updates the ban record by providing a valid unbanned_at datetime and updated reason.
 * 4) Validate the response returns the full updated ban record with changes.
 * 5) Verify authorization is enforced only for admin role.
 */
export async function test_api_community_platform_admin_banned_users_update_unban_and_reason_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and obtains authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {};
  const authorizedAdmin: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: adminJoinBody,
    });
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 2. Create a ban record as prerequisite
  const bannedUserCreatedRaw =
    await generate_random_community_platform_admin_banned_users_create(
      adminConnection,
      { body: {} },
    );
  // Assert as IEntity & { reason: string; unbanned_at: string } to access required props
  const bannedUserCreated =
    typia.assert<IEntity & { reason: string; unbanned_at: string }>(
      bannedUserCreatedRaw,
    );
  // 3. Perform update with unbanned_at and reason change
  const updatedReason = `Updated reason ${Date.now()}`;
  const newUnbannedAt = new Date().toISOString();
  const updateBody: ICommunityPlatformBannedUser.IUpdate = {
    unbanned_at: newUnbannedAt,
    reason: updatedReason,
  };
  const updatedBanRecordRaw =
    await api.functional.communityPlatform.admin.bannedUsers.update(
      adminConnection,
      {
        bannedUserId: bannedUserCreated.id,
        body: updateBody,
      },
    );
  const updatedBanRecord =
    typia.assert<IEntity & { reason: string; unbanned_at: string }>(updatedBanRecordRaw);
  // 4. Validate that the ban record updated correctly
  TestValidator.equals(
    "banned user id equals",
    updatedBanRecord.id,
    bannedUserCreated.id,
  );
  TestValidator.equals(
    "reason updated",
    updatedBanRecord.reason,
    updatedReason,
  );
  TestValidator.equals(
    "unbanned_at updated",
    updatedBanRecord.unbanned_at,
    newUnbannedAt,
  );
  // 5. Authorization enforcement test: unauthorized update should fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update attempt",
    401,
    async () => {
      await api.functional.communityPlatform.admin.bannedUsers.update(
        unauthorizedConnection,
        {
          bannedUserId: bannedUserCreated.id,
          body: updateBody,
        },
      );
    },
  );
}
