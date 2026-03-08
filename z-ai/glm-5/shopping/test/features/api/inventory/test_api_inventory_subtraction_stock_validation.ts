import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_subtraction_stock_validation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test inventory subtraction with stock validation.
   *
   * This test validates that:
   * 1. Sellers can add inventory (positive quantity_change)
   * 2. Sellers can subtract inventory (negative quantity_change)
   * 3. System prevents negative stock when subtracting
   */
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: 100.0,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant (SKU)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}`.toUpperCase(),
          optionValues: {
            color: "Red",
            size: "Large",
          },
          price: 99.99,
        },
      },
    );
  typia.assert(variant);
  // 5. Seller adds initial inventory (100 units)
  const initialStock = 100;
  const addRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_change: initialStock,
          reason: "Initial stock from supplier",
        },
      },
    );
  typia.assert(addRecord);
  // Verify the inventory record has positive quantity_change and correct stock
  TestValidator.equals(
    "initial quantity_change",
    addRecord.quantityChange,
    initialStock,
  );
  TestValidator.equals(
    "reason preserved",
    addRecord.reason,
    "Initial stock from supplier",
  );
  TestValidator.equals(
    "stock after initial add",
    addRecord.variant.stock_quantity,
    initialStock,
  );
  // 6. Seller subtracts inventory (-10 units) for damaged goods
  const subtractionAmount = -10;
  const subtractRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_change: subtractionAmount,
          reason: "Damaged goods removed from warehouse",
        },
      },
    );
  typia.assert(subtractRecord);
  // Verify the subtraction record
  TestValidator.equals(
    "subtraction quantity_change",
    subtractRecord.quantityChange,
    subtractionAmount,
  );
  TestValidator.predicate(
    "reason contains damaged",
    subtractRecord.reason.includes("Damaged"),
  );
  // 7. Verify stock is now 90 units (from the inventory record response)
  const expectedStockAfterSubtract = initialStock + subtractionAmount; // 100 - 10 = 90
  TestValidator.equals(
    "stock after subtraction",
    subtractRecord.variant.stock_quantity,
    expectedStockAfterSubtract,
  );
  // 8. Attempt to subtract more than available stock (-200 units)
  // This should fail because current stock is 90, and 90 + (-200) = -110 < 0
  const excessiveSubtraction = -200;
  await TestValidator.error(
    "should reject subtraction exceeding available stock",
    async () => {
      await generate_random_shopping_mall_seller_variants_inventory_records_create(
        sellerConnection,
        {
          params: {
            variantId: variant.id,
          },
          body: {
            quantity_change: excessiveSubtraction,
            reason: "Attempting to subtract more than available stock",
          },
        },
      );
    },
  );
}
