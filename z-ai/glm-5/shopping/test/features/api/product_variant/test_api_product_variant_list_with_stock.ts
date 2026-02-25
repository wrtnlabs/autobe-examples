import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
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
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test listing product variants with stock quantity calculation.
 *
 * This test validates that the variant list endpoint correctly:
 * - Returns paginated list of variants with stock information
 * - Calculates stock_quantity from SUM of inventory history records
 * - Sets in_stock flag based on stock_quantity > 0
 * - Includes variant options (key-value pairs)
 * - Returns price (null means variant uses product base_price)
 * - Provides correct pagination metadata
 *
 * Prerequisites:
 * - Admin account to approve seller
 * - Approved seller account
 * - Product with two variants (Red and Blue colors)
 * - Inventory added to Red variant only
 */
export async function test_api_product_variant_list_with_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller account (will be pending initially)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller creates a product with a category
  // First we need a category - create product which requires category_id
  // We'll use the generation function to create the product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Create first variant (Red color)
  const redVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `RED-${RandomGenerator.alphaNumeric(8)}`,
          price: null, // Uses product base_price
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: 0, // No initial stock
        },
      },
    );
  typia.assert(redVariant);
  // 6. Create second variant (Blue color)
  const blueVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `BLUE-${RandomGenerator.alphaNumeric(8)}`,
          price: null, // Uses product base_price
          optionValues: [{ key: "color", value: "Blue" }],
          stockQuantity: 0, // No initial stock
        },
      },
    );
  typia.assert(blueVariant);
  // 7. Add inventory to Red variant only
  const inventoryQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const inventoryRecord =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: redVariant.id },
        body: {
          quantity: inventoryQuantity,
          reason: "Initial restock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 8. Call the variant list endpoint
  const variantList =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {}, // No filters, get all variants
      },
    );
  typia.assert(variantList);
  // 9. Verify pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    () => variantList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => variantList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    () => variantList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    () => variantList.pagination.pages >= 0,
  );
  // 10. Verify we have exactly 2 variants
  TestValidator.equals("variant count", variantList.data.length, 2);
  // 11. Find variants by their options
  const variants = variantList.data;
  const foundRedVariant = variants.find((v) =>
    v.options.some((opt) => opt.key === "color" && opt.value === "Red"),
  );
  const foundBlueVariant = variants.find((v) =>
    v.options.some((opt) => opt.key === "color" && opt.value === "Blue"),
  );
  TestValidator.predicate(
    "Red variant found",
    () => foundRedVariant !== undefined,
  );
  TestValidator.predicate(
    "Blue variant found",
    () => foundBlueVariant !== undefined,
  );
  // 12. Verify Red variant has stock (inventory was added)
  if (foundRedVariant) {
    TestValidator.equals(
      "Red variant stock quantity",
      foundRedVariant.stock_quantity,
      inventoryQuantity,
    );
    TestValidator.equals(
      "Red variant in_stock",
      foundRedVariant.in_stock,
      true,
    );
    TestValidator.predicate(
      "Red variant has valid id",
      () => foundRedVariant.id === redVariant.id,
    );
    TestValidator.predicate(
      "Red variant has sku_code",
      () => typeof foundRedVariant.sku_code === "string",
    );
    TestValidator.equals(
      "Red variant price is null (uses base price)",
      foundRedVariant.price,
      null,
    );
  }
  // 13. Verify Blue variant has no stock (no inventory added)
  if (foundBlueVariant) {
    TestValidator.equals(
      "Blue variant stock quantity",
      foundBlueVariant.stock_quantity,
      0,
    );
    TestValidator.equals(
      "Blue variant in_stock",
      foundBlueVariant.in_stock,
      false,
    );
    TestValidator.predicate(
      "Blue variant has valid id",
      () => foundBlueVariant.id === blueVariant.id,
    );
    TestValidator.predicate(
      "Blue variant has sku_code",
      () => typeof foundBlueVariant.sku_code === "string",
    );
    TestValidator.equals(
      "Blue variant price is null (uses base price)",
      foundBlueVariant.price,
      null,
    );
  }
  // 14. Verify options structure
  if (foundRedVariant) {
    TestValidator.predicate("Red variant has options array", () =>
      Array.isArray(foundRedVariant.options),
    );
    TestValidator.equals(
      "Red variant options count",
      foundRedVariant.options.length,
      1,
    );
    const colorOption = foundRedVariant.options.find(
      (opt) => opt.key === "color",
    );
    TestValidator.predicate(
      "Red variant has color option",
      () => colorOption !== undefined,
    );
    if (colorOption) {
      TestValidator.equals("Red variant color value", colorOption.value, "Red");
    }
  }
  if (foundBlueVariant) {
    TestValidator.predicate("Blue variant has options array", () =>
      Array.isArray(foundBlueVariant.options),
    );
    TestValidator.equals(
      "Blue variant options count",
      foundBlueVariant.options.length,
      1,
    );
    const colorOption = foundBlueVariant.options.find(
      (opt) => opt.key === "color",
    );
    TestValidator.predicate(
      "Blue variant has color option",
      () => colorOption !== undefined,
    );
    if (colorOption) {
      TestValidator.equals(
        "Blue variant color value",
        colorOption.value,
        "Blue",
      );
    }
  }
  // 15. Test filtering by in-stock status
  const inStockVariants =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { inStock: true },
      },
    );
  typia.assert(inStockVariants);
  TestValidator.equals(
    "in-stock filter returns 1 variant",
    inStockVariants.data.length,
    1,
  );
  TestValidator.predicate("in-stock variant is Red", () =>
    inStockVariants.data[0].options.some(
      (opt) => opt.key === "color" && opt.value === "Red",
    ),
  );
  // 16. Test filtering by option value
  const redVariants =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { options: { color: "Red" } },
      },
    );
  typia.assert(redVariants);
  TestValidator.equals(
    "option filter returns 1 variant",
    redVariants.data.length,
    1,
  );
  TestValidator.predicate("filtered variant is Red", () =>
    redVariants.data[0].options.some(
      (opt) => opt.key === "color" && opt.value === "Red",
    ),
  );
}
