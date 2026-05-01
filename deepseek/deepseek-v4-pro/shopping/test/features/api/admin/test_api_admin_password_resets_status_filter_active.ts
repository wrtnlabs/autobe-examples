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
 * Test filtering password reset tokens by active status for a specific administrator.
 *
 * Validates that when an authenticated administrator queries the password reset
 * history for a specific admin with the status filter set to 'active', only tokens
 * that have not yet expired (expired_at is in the future relative to now) are
 * returned. This confirms the computed status filter correctly distinguishes
 * active tokens from expired tokens for security auditing purposes.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Administrator queries password reset history for the same admin with status filter 'active'.
 * 3. Validates that all returned tokens have expired_at timestamps strictly in the future.
 */
export async function test_api_admin_password_resets_status_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Query password reset tokens filtered by active status
  const result =
    await api.functional.shoppingMall.admin.admins.password_resets.index(
      adminConnection,
      {
        adminId: admin.id,
        body: {
          status: "active",
        } satisfies IShoppingMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate all returned tokens have expired_at in the future
  const now = new Date().toISOString();
  for (const reset of result.data) {
    TestValidator.predicate(
      "token should have expired_at in the future",
      reset.expired_at > now,
    );
  }
}
