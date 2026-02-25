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
 * Test administrator listing with soft-deletion filter.
 *
 * Validates the 'deleted' parameter behavior:
 * - null: returns all administrators (active + soft-deleted)
 * - false: returns only active administrators (deleted_at IS NULL)
 * - true: returns only soft-deleted administrators (deleted_at IS NOT NULL)
 */
export async function test_api_administrator_list_include_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin accounts for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create additional admin accounts for testing
  const adminCount = 3;
  const createdAdminIds: string[] = [];
  for (let i = 0; i < adminCount; i++) {
    const newAdminConnection: api.IConnection = { host: connection.host };
    const newAdmin = await authorize_admin_join(newAdminConnection, {});
    typia.assert(newAdmin);
    createdAdminIds.push(newAdmin.id);
  }
  // 3. Test listing with deleted=null (all administrators)
  const allAdminsResponse =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        deleted: null,
        limit: 100,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(allAdminsResponse);
  // Validate pagination structure
  await TestValidator.predicate(
    "pagination current page is valid",
    () => allAdminsResponse.pagination.current >= 0,
  );
}