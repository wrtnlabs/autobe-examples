import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test filtering product variants by option key-value pairs.
 *
 * Prerequisites: Create admin account, seller account (approved), product with three variants
 * having different option combinations (Red-Small, Red-Large, Blue-Small).
 *
 * Test Steps:
 * 1. Filter by color=Red → returns 2 variants (Red-Small, Red-Large)
 * 2. Filter by color=Red AND size=Large → returns 1 variant (Red-Large)
 * 3. Filter by size=Small → returns 2 variants (Red-Small, Blue-Small)
 *
 * Business Rule Validation:
 * - Multiple option filters are combined with AND logic
 * - Options filter performs exact match on key-value pairs
 */
export async function test_api_product_variant_filter_by_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create seller account (pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Create product with random category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1>>(),
      },
    },
  );
  typia.assert(product);
  // 5. Create variant 1: color=Red, size=Small
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-RED-SMALL-${RandomGenerator.alphaNumeric(4)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Small" },
          ],
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  // 6. Create variant 2: color=Red, size=Large
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-RED-LARGE-${RandomGenerator.alphaNumeric(4)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          stockQuantity: 15,
        },
      },
    );
  typia.assert(variant2);
  // 7. Create variant 3: color=Blue, size=Small
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-BLUE-SMALL-${RandomGenerator.alphaNumeric(4)}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Small" },
          ],
          stockQuantity: 20,
        },
      },
    );
  typia.assert(variant3);
  // Test 1: Filter by color=Red
  const filterRed =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          options: { color: "Red" },
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(filterRed);
  TestValidator.equals(
    "color=Red returns 2 variants",
    filterRed.data.length,
    2,
  );
  TestValidator.predicate(
    "all variants have color=Red",
    filterRed.data.every((v) =>
      v.options.some((o) => o.key === "color" && o.value === "Red"),
    ),
  );
  TestValidator.predicate(
    "Blue-Small variant not included",
    !filterRed.data.some((v) =>
      v.options.some((o) => o.key === "color" && o.value === "Blue"),
    ),
  );
  // Test 2: Filter by color=Red AND size=Large
  const filterRedLarge =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          options: { color: "Red", size: "Large" },
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(filterRedLarge);
  TestValidator.equals(
    "color=Red AND size=Large returns 1 variant",
    filterRedLarge.data.length,
    1,
  );
  TestValidator.predicate(
    "variant has both color=Red AND size=Large",
    filterRedLarge.data[0].options.some(
      (o) => o.key === "color" && o.value === "Red",
    ) &&
      filterRedLarge.data[0].options.some(
        (o) => o.key === "size" && o.value === "Large",
      ),
  );
  TestValidator.equals(
    "variant is Red-Large",
    filterRedLarge.data[0].id,
    variant2.id,
  );
  // Test 3: Filter by size=Small
  const filterSmall =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          options: { size: "Small" },
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(filterSmall);
  TestValidator.equals(
    "size=Small returns 2 variants",
    filterSmall.data.length,
    2,
  );
  TestValidator.predicate(
    "all variants have size=Small",
    filterSmall.data.every((v) =>
      v.options.some((o) => o.key === "size" && o.value === "Small"),
    ),
  );
  TestValidator.predicate(
    "Red-Large variant not included",
    !filterSmall.data.some((v) =>
      v.options.some((o) => o.key === "size" && o.value === "Large"),
    ),
  );
}
