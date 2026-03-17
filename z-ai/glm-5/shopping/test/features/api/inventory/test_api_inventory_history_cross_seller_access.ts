import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator cross-seller inventory history access.
 *
 * Verifies that administrators can view inventory history for product variants
 * owned by any seller on the platform for platform oversight and dispute resolution.
 */
export async function test_api_inventory_history_cross_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create independent administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Setup: Create seller account (variant owner)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const sellerId = sellerAuth.id;
  // 3. Create category (administrator action)
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      { body: { name: `TestCategory-${RandomGenerator.alphaNumeric(8)}` } },
    );
  typia.assert(category);
  // 4. Seller creates product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `TestProduct-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 5. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          option_values: {
            color: RandomGenerator.pick([
              "Red",
              "Blue",
              "Green",
              "Black",
              "White",
            ]),
            size: RandomGenerator.pick(["S", "M", "L", "XL"]),
          },
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 6. Seller creates multiple inventory records
  const inventoryRecords: IShoppingMallInventoryRecord[] = [];
  for (let i = 0; i < 3; i++) {
    const record =
      await generate_random_shopping_mall_seller_variants_inventory_adjust(
        sellerConnection,
        {
          params: { variantId: variant.id },
          body: {
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
            reason: `Initial stock restock #${i + 1}`,
          },
        },
      );
    typia.assert(record);
    inventoryRecords.push(record);
  }
  // 7. Test: Administrator requests inventory history for seller's variant
  const inventoryHistory =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
          sourceType: "all",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryHistory);
  // 8. Validation: Administrator successfully receives inventory history
  TestValidator.predicate(
    "Administrator can access seller's variant inventory history",
    inventoryHistory.pagination.records >= inventoryRecords.length,
  );
  TestValidator.predicate(
    "All inventory records are returned",
    inventoryHistory.data.length >= inventoryRecords.length,
  );
  TestValidator.predicate(
    "Variant in response shows correct variant ID",
    inventoryHistory.data.every((record) => record.variant.id === variant.id),
  );
  TestValidator.predicate(
    "Each record has valid sourceType",
    inventoryHistory.data.every(
      (record) =>
        record.sourceType === "manual" ||
        record.sourceType === "order" ||
        record.sourceType === "cancellation" ||
        record.sourceType === "refund",
    ),
  );
  TestValidator.predicate(
    "Records contain correct SKU code reference",
    inventoryHistory.data.every(
      (record) => record.variant.skuCode === variant.sku_code,
    ),
  );
  // Validate pagination structure
  TestValidator.predicate(
    "Pagination structure is valid",
    inventoryHistory.pagination.current === 1 &&
      inventoryHistory.pagination.limit === 100 &&
      inventoryHistory.pagination.pages >= 1,
  );
  // Verify the product belongs to seller, not administrator
  TestValidator.equals(
    "Product belongs to seller, not administrator",
    product.seller.id,
    sellerId,
  );
}
