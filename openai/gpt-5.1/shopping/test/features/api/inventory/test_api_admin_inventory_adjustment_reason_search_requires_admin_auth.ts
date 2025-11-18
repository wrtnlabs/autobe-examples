import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAdjustmentReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

export async function test_api_admin_inventory_adjustment_reason_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by copying base connection and forcing empty headers.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Attempt to call inventoryAdjustmentReasons.index without Authorization header.
  const unauthSearchBody = {
    page: 1,
    limit: 1,
  } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  await TestValidator.error(
    "unauthenticated inventory adjustment reason search must fail",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
        unauthConn,
        {
          body: unauthSearchBody,
        },
      );
    },
  );

  // 3. Create a new admin via POST /auth/admin/join to obtain valid admin auth.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Let the backend derive IP; explicitly set to null to satisfy union type without omission.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // Basic business invariant: returned email matches join request email.
  TestValidator.equals(
    "admin join response email should match requested email",
    adminAuth.email,
    adminJoinBody.email,
  );

  // 4. Call inventoryAdjustmentReasons.index again using the authenticated connection.
  const authSearchBody = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  const page: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      {
        body: authSearchBody,
      },
    );
  typia.assert(page);

  // 5. Validate pagination consistency and structural correctness.
  TestValidator.equals(
    "current page should equal requested page",
    page.pagination.current,
    authSearchBody.page,
  );

  TestValidator.equals(
    "page limit should equal requested limit",
    page.pagination.limit,
    authSearchBody.limit,
  );

  TestValidator.predicate(
    "records count should be non-negative",
    page.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages count should be non-negative",
    page.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data array should have non-negative length",
    page.data.length >= 0,
  );
}
