import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_user_unban_already_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create user ban record through mock data since no user_bans.create endpoint exists
  // Generate a ban record with expired unban_at timestamp
  const expiredBan = typia.random<IEcommerceMallUserBan>();
  const expiredBanWithTimestamps: IEcommerceMallUserBan = {
    ...expiredBan,
    bannedAt: new Date().toISOString(),
    unbanAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Expired 1 day ago
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // Note: This test assumes a way to create an already-expired ban record exists
  // In real implementation, this would use a test utility or direct database access
  // to set up the pre-condition of an already-expired ban record
  // 3. Attempt to unban the already inactive (expired) ban record
  const unbanResult: IEcommerceMallUserBan =
    await api.functional.ecommerceMall.admin.user_bans.unban(adminConnection, {
      userBanId: expiredBanWithTimestamps.id,
    });
  typia.assert(unbanResult);
  // 4. Validate unban results
  TestValidator.equals("is_active is false", unbanResult.isActive, false);
  TestValidator.predicate(
    "unban_at is updated",
    unbanResult.unbanAt !== null && unbanResult.unbanAt !== undefined,
  );
  TestValidator.equals("admin_id preserved", unbanResult.adminId, admin.id);
  TestValidator.equals(
    "user_id preserved",
    unbanResult.userId,
    expiredBanWithTimestamps.userId,
  );
  TestValidator.equals(
    "reason preserved",
    unbanResult.reason,
    expiredBanWithTimestamps.reason,
  );
  TestValidator.equals(
    "user_type preserved",
    unbanResult.userType,
    expiredBanWithTimestamps.userType,
  );
}
