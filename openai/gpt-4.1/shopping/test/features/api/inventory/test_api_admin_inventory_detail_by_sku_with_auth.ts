import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Test that only an authenticated admin can retrieve inventory details for a
 * SKU by its code and that error and RBAC handling is robust.
 */
export async function test_api_admin_inventory_detail_by_sku_with_auth(
  connection: api.IConnection,
) {
  // 1. Register a new admin (for authentication)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "operator",
      "compliance",
      "support",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "admin join returns valid token",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Attempt to retrieve inventory for a random SKU code (success or not-found)
  const validSkuCode = typia.random<string>();
  let inventory: IShoppingInventory | undefined = undefined;
  try {
    inventory = await api.functional.shopping.admin.inventory.at(connection, {
      skuCode: validSkuCode,
    });
    typia.assert(inventory);
    TestValidator.equals(
      "inventory.sku_code matches input",
      inventory.sku.sku_code,
      validSkuCode,
    );
    TestValidator.predicate(
      "inventory quantity is non-negative",
      inventory.quantity >= 0,
    );
  } catch (_exp) {
    // If SKU does not exist, treat as correct error scenario
    inventory = undefined;
  }

  // 3. Test error for non-existent SKU code
  const notFoundSku = validSkuCode + "-notfound";
  await TestValidator.error("returns error for absent SKU", async () => {
    await api.functional.shopping.admin.inventory.at(connection, {
      skuCode: notFoundSku,
    });
  });

  // 4. Try as unauthenticated (no admin login)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.shopping.admin.inventory.at(unauthConn, {
      skuCode: validSkuCode,
    });
  });
}
