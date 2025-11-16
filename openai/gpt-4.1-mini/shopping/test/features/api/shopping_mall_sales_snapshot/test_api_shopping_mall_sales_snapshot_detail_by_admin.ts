import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSalesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesSnapshot";

export async function test_api_shopping_mall_sales_snapshot_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user register and login to get authorization
  const admin_create_body = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: "StrongPassw0rd!",
    phone_number: null,
    role: RandomGenerator.pick(["superadmin", "admin", "support"] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: admin_create_body,
    });
  typia.assert(adminAuthorized);

  // 2. Use a random valid snapshot ID for fetching
  const validSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve snapshot details by valid ID
  const snapshot: IShoppingMallSalesSnapshot =
    await api.functional.shoppingMall.admin.shoppingMallSalesSnapshots.at(
      connection,
      {
        id: validSnapshotId,
      },
    );
  typia.assert(snapshot);

  // 4. Attempt to retrieve snapshot with a non-existent UUID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should throw error for non-existent snapshot id",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallSalesSnapshots.at(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
