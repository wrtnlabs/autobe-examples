import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantInventory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_inventory_status_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate with join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join" as const,
    referrer: "https://example.com/admin/signup" as const,
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Step 2: Generate a random product ID for inventory retrieval
  // Note: We don't need to create a product as the inventory endpoint works with any productId
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve inventory status using admin connection
  const inventory: IShoppingMallProductVariantInventory =
    await api.functional.shoppingMall.admin.products.inventory.at(
      adminConnection,
      {
        productId,
      },
    );
  typia.assert(inventory);
  // Step 4: Validate inventory fields
  // Validate quantity is a non-negative integer
  TestValidator.predicate("quantity is non-negative", inventory.quantity >= 0);
  // Validate low_stock_threshold is a non-negative integer
  TestValidator.predicate(
    "low_stock_threshold is non-negative",
    inventory.low_stock_threshold >= 0,
  );
  // Validate backorder_allowed is boolean
  TestValidator.predicate(
    "backorder_allowed is boolean",
    typeof inventory.backorder_allowed === "boolean",
  );
  // Validate availability_status is one of the valid enum values
  TestValidator.predicate(
    "availability_status is valid",
    ["green", "yellow", "red", "gray"].includes(inventory.availability_status),
  );
  // Validate min_order_quantity is a positive integer
  TestValidator.predicate(
    "min_order_quantity is positive",
    inventory.min_order_quantity >= 1,
  );
  // Validate max_order_quantity is either 0 (unlimited) or a positive integer
  TestValidator.predicate(
    "max_order_quantity is 0 or positive",
    inventory.max_order_quantity === 0 || inventory.max_order_quantity >= 1,
  );
  // Validate availability_status logic based on business rules
  // green: quantity > 0
  // yellow: quantity > 0 but quantity <= low_stock_threshold
  // red: quantity = 0 and backorder_allowed = false
  // gray: quantity = 0 and backorder_allowed = true
  TestValidator.predicate(
    "availability_status logic matches business rules",
    (inventory.quantity > 0 && inventory.availability_status === "green") ||
      (inventory.quantity > 0 &&
        inventory.quantity <= inventory.low_stock_threshold &&
        inventory.availability_status === "yellow") ||
      (inventory.quantity === 0 &&
        !inventory.backorder_allowed &&
        inventory.availability_status === "red") ||
      (inventory.quantity === 0 &&
        inventory.backorder_allowed &&
        inventory.availability_status === "gray"),
  );
}
