import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product variant listing with option details.
 * 1. Seller registers account
 * 2. Seller creates a product
 * 3. Retrieve product variants with pagination
 * 4. Validate variant structure and option values
 */
export async function test_api_product_variant_listing_with_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product for testing variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Retrieve product variants with pagination
  const variantList = await api.functional.shoppingMall.products.variants.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 20,
        sort: "createdAt,desc",
        deleted: false,
      } satisfies IShoppingMallProductVariant.IRequest,
    },
  );
  typia.assert(variantList);
  // 4. Validate pagination metadata
  void TestValidator.predicate(
    "current page is 1",
    variantList.pagination.current === 1,
  );
  void TestValidator.predicate("limit is 20", variantList.pagination.limit === 20);
  void TestValidator.predicate("has data array", Array.isArray(variantList.data));
  // 5. Validate each variant structure (if variants exist)
  for (const variant of variantList.data) {
    // Validate SKU code exists
    void TestValidator.predicate(
      "SKU code exists",
      !!(variant.skuCode && variant.skuCode.length > 0),
    );
    // Validate option values array
    void TestValidator.predicate(
      "has option values",
      Array.isArray(variant.optionValues),
    );
    // Validate each option has key-value pair
    for (const option of variant.optionValues) {
      void TestValidator.predicate(
        "option has key",
        !!(option.key && option.key.length > 0),
      );
      void TestValidator.predicate(
        "option has value",
        !!(option.value && option.value.length > 0),
      );
    }
    // Validate stock quantity is non-negative
    void TestValidator.predicate(
      "stock quantity non-negative",
      variant.stockQuantity >= 0,
    );
    // Validate price is either null or positive number
    if (variant.price !== null && variant.price !== undefined) {
      void TestValidator.predicate("price is positive", variant.price > 0);
    }
  }
  // 6. Validate variant count matches pagination
  void TestValidator.predicate(
    "data count within limit",
    variantList.data.length <= variantList.pagination.limit,
  );
}