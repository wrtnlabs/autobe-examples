import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_inventory_record_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create Seller A (product owner)
  // ============================================================
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerA);
  // ============================================================
  // SETUP: Create Seller B (different seller for authorization test)
  // ============================================================
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerB);
  // ============================================================
  // SETUP: Create Admin (for oversight access test)
  // ============================================================
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // ============================================================
  // SETUP: Seller A creates a product
  // ============================================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // ============================================================
  // SETUP: Seller A creates a variant under the product
  // ============================================================
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: typia.random<string>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // ============================================================
  // SETUP: Seller A creates inventory records for the variant
  // ============================================================
  const inventoryRecord1 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerAConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: "RESTOCK",
        },
      },
    );
  typia.assert(inventoryRecord1);
  const inventoryRecord2 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerAConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: -typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
          reason: "ADJUSTMENT",
        },
      },
    );
  typia.assert(inventoryRecord2);
  // ============================================================
  // TEST 1: Seller A queries their own variant's inventory records
  // Should succeed with full results
  // ============================================================
  const sellerAInventory =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerAConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sellerAInventory);
  TestValidator.predicate(
    "Seller A can view own inventory records",
    () => sellerAInventory.data.length >= 2,
  );
  TestValidator.predicate(
    "Inventory records have correct structure",
    () =>
      sellerAInventory.data[0].id !== undefined &&
      sellerAInventory.data[0].quantity_change !== undefined &&
      sellerAInventory.data[0].reason !== undefined &&
      sellerAInventory.data[0].created_at !== undefined,
  );
  // ============================================================
  // TEST 2: Seller B attempts to query Seller A's variant inventory
  // Should be rejected with authorization error
  // ============================================================
  await TestValidator.error(
    "Seller B cannot access Seller A's inventory records",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.inventory.index(
        sellerBConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
  // ============================================================
  // TEST 3: Verify variant-product relationship validation
  // Wrong variant ID for the product should fail
  // ============================================================
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: typia.random<string>(),
          stock_quantity: 10,
          options: [{ key: "size", value: "Large" }],
        },
      },
    );
  typia.assert(variant2);
  await TestValidator.error(
    "Variant must belong to specified product",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.inventory.index(
        sellerAConnection,
        {
          productId: product.id,
          variantId: variant2.id,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
  // ============================================================
  // TEST 4: Admin queries Seller A's inventory records
  // Should succeed (admin has oversight access)
  // ============================================================
  const adminInventory =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(adminInventory);
  TestValidator.predicate(
    "Admin can view all inventory records",
    () => adminInventory.data.length >= 2,
  );
  // ============================================================
  // TEST 5: Verify response structure consistency
  // All records include required fields regardless of who queries
  // ============================================================
  TestValidator.equals(
    "Admin and Seller A see same record count",
    adminInventory.data.length,
    sellerAInventory.data.length,
  );
  for (const record of adminInventory.data) {
    TestValidator.predicate(
      "Record has valid id",
      () =>
        record.id !== undefined &&
        typeof record.id === "string" &&
        record.id.length > 0,
    );
    TestValidator.predicate(
      "Record has valid quantity_change",
      () => typeof record.quantity_change === "number",
    );
    TestValidator.predicate(
      "Record has valid reason",
      () =>
        record.reason !== undefined &&
        typeof record.reason === "string" &&
        record.reason.length > 0,
    );
    TestValidator.predicate(
      "Record has valid created_at",
      () =>
        record.created_at !== undefined &&
        typeof record.created_at === "string",
    );
  }
  // ============================================================
  // TEST 6: Verify inventory records are accessible for audit
  // Records should remain accessible even after variant operations
  // ============================================================
  const filteredInventory =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerAConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
          reason: "RESTOCK",
        },
      },
    );
  typia.assert(filteredInventory);
  TestValidator.predicate("Filtering by reason works correctly", () =>
    filteredInventory.data.every((r) => r.reason === "RESTOCK"),
  );
  TestValidator.predicate(
    "Pagination metadata is present",
    () =>
      sellerAInventory.pagination.current !== undefined &&
      sellerAInventory.pagination.limit !== undefined &&
      sellerAInventory.pagination.records !== undefined &&
      sellerAInventory.pagination.pages !== undefined,
  );
}
