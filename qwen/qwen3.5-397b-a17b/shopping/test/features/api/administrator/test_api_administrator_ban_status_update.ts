import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator banning and unbanning administrator accounts.
 *
 * Validates the complete ban status management workflow including banning administrators by setting banned_at timestamp, unbanning by clearing the timestamp to null, and atomic updates combining grade changes with ban status modifications. Ensures the update endpoint correctly processes ban status changes and returns the updated administrator record with accurate banned_at state.
 *
 * 1. Super administrator authenticates via registration.
 * 2. Scenario 1: Ban administrator by setting banned_at to current timestamp.
 * 3. Scenario 2: Unban administrator by setting banned_at to null.
 * 4. Scenario 3: Update both grade and ban status atomically in single request.
 * 5. Validates all responses contain correct administrator structure with proper banned_at values.
 */
export async function test_api_administrator_ban_status_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // Generate admin ID for testing
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const banTimestamp = new Date().toISOString();
  // 2. Scenario 1: Ban administrator by setting banned_at timestamp
  const bannedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId,
        body: {
          banned_at: banTimestamp,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(bannedAdmin);
  TestValidator.equals("ban timestamp set", bannedAdmin.bannedAt, banTimestamp);
  // 3. Scenario 2: Unban administrator by setting banned_at to null
  const unbannedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId,
        body: {
          banned_at: null,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(unbannedAdmin);
  TestValidator.equals("ban cleared", unbannedAdmin.bannedAt, null);
  // 4. Scenario 3: Update both grade and ban status atomically
  const updatedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId,
        body: {
          grade: "regular",
          banned_at: banTimestamp,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin);
  TestValidator.equals("grade updated", updatedAdmin.grade, "regular");
  TestValidator.equals(
    "ban timestamp restored",
    updatedAdmin.bannedAt,
    banTimestamp,
  );
}
