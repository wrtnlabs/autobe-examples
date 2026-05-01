import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test including soft-deleted administrator accounts for audit purposes.
 *
 * Validates the admin listing endpoint's `includeDeleted` flag behavior. When `includeDeleted` is true, the response includes both active administrators (deleted_at is null) and deactivated administrators (deleted_at is a non-null timestamp). When `includeDeleted` is false or omitted, only active accounts with null deleted_at appear.
 *
 * 1. Register and authenticate a new administrator account via join.
 * 2. List administrators with includeDeleted set to true and verify pagination.
 * 3. Confirm the authenticated admin appears in the listing with deleted_at as null.
 * 4. List administrators with includeDeleted omitted (defaults to false) and verify every returned account has deleted_at as null.
 */
export async function test_api_admin_list_include_deleted_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. List administrators with includeDeleted set to true
  const includeDeletedResult =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        includeDeleted: true,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(includeDeletedResult);
  // 3. Verify pagination structure
  TestValidator.predicate(
    "pagination current >= 1",
    includeDeletedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "records count >= 1",
    includeDeletedResult.pagination.records >= 1,
  );
  // 4. Verify our admin appears in results with correct data
  const ourAdmin = includeDeletedResult.data.find((a) => a.id === admin.id);
  TestValidator.predicate("our admin found in listing", ourAdmin !== undefined);
  TestValidator.equals("email matches", ourAdmin!.email, admin.email);
  TestValidator.equals("grade matches", ourAdmin!.grade, admin.grade);
  TestValidator.equals(
    "deleted_at is null for active admin",
    ourAdmin!.deleted_at,
    null,
  );
  // 5. List with includeDeleted omitted (defaults to false)
  const activeOnlyResult = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(activeOnlyResult);
  // 6. Verify all returned admins have deleted_at as null
  for (const adminSummary of activeOnlyResult.data) {
    TestValidator.equals(
      `admin ${adminSummary.id} deleted_at is null`,
      adminSummary.deleted_at,
      null,
    );
  }
}
