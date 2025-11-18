import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

export async function test_api_admin_inventory_adjustment_reason_get_by_reason_code_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a known inventory adjustment reason as this admin
  const reasonCode = "AUTH_PROTECTED_TEST";
  const createBody = {
    code: reasonCode,
    name: "Auth protected test reason",
    description:
      "Reason used to verify admin-only access control on GET-by-code endpoint.",
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(createdReason);

  TestValidator.equals(
    "created reason code should match request payload",
    createdReason.code,
    reasonCode,
  );

  // 3. Call GET-by-code without any Authorization header using an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "anonymous access to admin inventory adjustment reason by code should be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.at(
        unauthenticatedConnection,
        {
          reasonCode,
        },
      );
    },
  );

  // 4. Call GET-by-code again with the valid authenticated admin connection
  const fetchedReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.at(
      connection,
      {
        reasonCode,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(fetchedReason);

  // 5. Verify that the fetched record matches the created record
  TestValidator.equals(
    "fetched reason code matches created reason",
    fetchedReason.code,
    createdReason.code,
  );
  TestValidator.equals(
    "fetched reason name matches created reason",
    fetchedReason.name,
    createdReason.name,
  );
  TestValidator.equals(
    "fetched reason description matches created reason",
    fetchedReason.description ?? null,
    createdReason.description ?? null,
  );
  TestValidator.equals(
    "fetched reason direction matches created reason",
    fetchedReason.direction,
    createdReason.direction,
  );
  TestValidator.equals(
    "fetched reason is_system_managed flag matches created reason",
    fetchedReason.is_system_managed,
    createdReason.is_system_managed,
  );
}
