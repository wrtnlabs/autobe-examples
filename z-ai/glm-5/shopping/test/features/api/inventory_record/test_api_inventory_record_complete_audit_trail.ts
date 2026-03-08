import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
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

export async function test_api_inventory_record_complete_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      { body: { name: RandomGenerator.name() } },
    );
  typia.assert(category);
  // 3. Create seller connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name() + "'s Shop",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 4. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name() + " Product",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SKU-" + RandomGenerator.alphaNumeric(8),
          optionValues: {
            color: RandomGenerator.pick([
              "Red",
              "Blue",
              "Green",
              "Black",
            ] as const),
            size: RandomGenerator.pick(["Small", "Medium", "Large"] as const),
          },
          price: 150,
        },
      },
    );
  typia.assert(variant);
  // 6. Create inventory record (manual restock)
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock from supplier",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Query inventory records
  const result =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        },
      },
    );
  typia.assert(result);
  // 8. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "records count positive",
    result.pagination.records > 0,
  );
  TestValidator.predicate("pages count positive", result.pagination.pages > 0);
  // 9. Validate inventory records exist
  TestValidator.predicate("has records", result.data.length > 0);
  // 10. Find the manual restock record
  const manualRecord = result.data.find(
    (record) => record.reason === "Initial stock from supplier",
  );
  TestValidator.predicate("manual record found", manualRecord !== undefined);
  if (manualRecord !== undefined) {
    // 11. Validate quantity change is positive
    TestValidator.predicate(
      "quantity change is positive",
      manualRecord.quantityChange > 0,
    );
    TestValidator.equals(
      "quantity change value",
      manualRecord.quantityChange,
      100,
    );
    // 12. Validate seller reference exists for manual adjustment
    TestValidator.predicate(
      "seller reference exists for manual adjustment",
      manualRecord.seller !== null,
    );
    // 13. Validate variant reference
    TestValidator.equals(
      "variant id matches",
      manualRecord.variant.id,
      variant.id,
    );
  }
  // 14. Verify all records have required fields
  for (const record of result.data) {
    TestValidator.predicate("has id", record.id !== undefined);
    TestValidator.predicate("has variant", record.variant !== undefined);
    TestValidator.predicate(
      "has quantityChange",
      typeof record.quantityChange === "number",
    );
    TestValidator.predicate("has reason", record.reason.length > 0);
    TestValidator.predicate("has createdAt", record.createdAt !== undefined);
  }
}
