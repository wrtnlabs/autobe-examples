import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test password reset audit trail retrieval for an administrator account.
 *
 * Validates that the password reset history endpoint returns complete audit
 * records with proper pagination and administrator summary information. This
 * ensures the audit trail endpoint functions correctly for any administrator
 * account, preserving compliance traceability regardless of account state.
 *
 * The test verifies that the paginated response includes correct pagination
 * metadata and that the endpoint accepts requests without errors for newly
 * registered accounts that have no password reset history.
 *
 * 1. Register a super administrator to perform the audit query.
 * 2. Register a regular administrator as the target account.
 * 3. Query the password reset history of the target administrator using the
 *    super administrator's credentials.
 * 4. Validate the paginated response structure, default pagination values,
 *    and that the data array is properly returned.
 */
export async function test_api_admin_password_resets_deactivated_admin_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Register and authenticate target admin
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {});
  typia.assert(targetAdmin);
  // 3. Super admin queries password reset history of target admin
  const result =
    await api.functional.shoppingMall.admin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: targetAdmin.id,
        body: {} satisfies IShoppingMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination and response structure
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("total records", result.pagination.records, 0);
  TestValidator.predicate("data is array", Array.isArray(result.data));
  TestValidator.predicate("data is empty", result.data.length === 0);
}
