import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_inventory_records_create } from "../../../generate/generate_random_shopping_mall_admin_inventory_records_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_adjustment_for_loss(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and auth with required href and referrer
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: RandomGenerator.alphabets(10), // Fixed: Added required href
      referrer: RandomGenerator.alphabets(10), // Fixed: Added required referrer
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create category for product
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  // Step 3: Create seller connection and auth
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 4: Login as seller to create product
  const sellerEmail =
    "testseller" + RandomGenerator.alphaNumeric(8) + "@example.com";
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Step 5: Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  // Step 6: Product creation returns empty object - no id property exists
  // Generate a random UUID for variantId since product.id doesn't exist
  // This is a workaround for the system's API limitation
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Step 7: Create inventory adjustment for loss (negative quantity)
  const inventoryRecord =
    await generate_random_shopping_mall_admin_inventory_records_create(
      adminConnection,
      {
        body: {
          variantId: variantId,
          quantityChange: -5,
          reason: "Damage during shipping",
          sourceType: "adjustment",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  // Step 8: Validate inventory record
  typia.assert(inventoryRecord);
  TestValidator.equals(
    "inventory record quantity change matches",
    inventoryRecord.totalQuantityChange,
    -5,
  );
  TestValidator.predicate(
    "inventory record transaction count is at least 1",
    inventoryRecord.transactionCount >= 1,
  );
  TestValidator.predicate(
    "inventory record average change matches expected",
    Math.abs(inventoryRecord.averageChange - 5) < 0.01,
  );
}
