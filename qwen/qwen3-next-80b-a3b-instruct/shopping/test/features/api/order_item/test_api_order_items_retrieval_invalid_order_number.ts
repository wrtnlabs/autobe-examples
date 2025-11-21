import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

export async function test_api_order_items_retrieval_invalid_order_number(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Test retrieval of items for non-existent order number with correct format
  const nonExistentOrderNumber: string =
    "ORD-" +
    "20991231" + // Valid format: YYYYMMDD
    "-" +
    typia
      .random<number & tags.Type<"uint32"> & tags.Maximum<99999>>()
      .toString()
      .padStart(5, "0"); // Valid format: NNNNN

  await TestValidator.error(
    "should return 404 for non-existent order number",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.index(connection, {
        orderNumber: nonExistentOrderNumber, // Valid format but non-existent order
        body: {},
      });
    },
  );
}
