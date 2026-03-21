import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test seller can filter product variants by price range using minPrice and maxPrice parameters.
 *
 * Scenario:
 * 1. Authenticate as seller
 * 2. Create a product with base_price
 * 3. Create variants with various prices:
 *    - Some below target range
 *    - Some within target range
 *    - Some above target range
 *    - One variant without price override (uses base_price)
 * 4. Test filtering by minPrice only (returns variants >= minPrice)
 * 5. Test filtering by maxPrice only (returns variants <= maxPrice)
 * 6. Test combined minPrice and maxPrice (returns variants within range)
 * 7. Verify variants without price override use parent's base_price for comparison
 */
export async function test_api_product_variant_filter_by_price_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product with base_price
  const basePrice = 100;
  const productInput = await prepare_random_ecommerce_mall_product({
    base_price: basePrice,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: productInput,
    },
  );
  typia.assert(product);
  // 3. Create variants with various prices
  // Variant 1: Below target range (price = 50)
  const variant1 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-BELOW-${RandomGenerator.alphaNumeric(6)}`,
          price: 50,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant1);
  // Variant 2: Within target range (price = 100)
  const variant2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-WITHIN1-${RandomGenerator.alphaNumeric(6)}`,
          price: 100,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "Blue",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant2);
  // Variant 3: Within target range (price = 150)
  const variant3 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-WITHIN2-${RandomGenerator.alphaNumeric(6)}`,
          price: 150,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "Green",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant3);
  // Variant 4: Above target range (price = 200)
  const variant4 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-ABOVE-${RandomGenerator.alphaNumeric(6)}`,
          price: 200,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "Yellow",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant4);
  // Variant 5: No price override (uses base_price = 100)
  const variant5 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-NO-OVERRIDE-${RandomGenerator.alphaNumeric(6)}`,
          price: null,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "Black",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant5);
  // 4. Test filtering by minPrice only (should return variants with price >= 100)
  const minPriceOnlyResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          minPrice: 100,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(minPriceOnlyResult);
  // Should include: variant2 (100), variant3 (150), variant4 (200), variant5 (base_price=100)
  TestValidator.equals(
    "minPrice only returns 4 variants (>= 100)",
    minPriceOnlyResult.data.length,
    4,
  );
  const minPriceIds = minPriceOnlyResult.data.map((v) => v.id);
  TestValidator.predicate(
    "variant2 (100) included with minPrice 100",
    minPriceIds.includes(variant2.id),
  );
  TestValidator.predicate(
    "variant3 (150) included with minPrice 100",
    minPriceIds.includes(variant3.id),
  );
  TestValidator.predicate(
    "variant4 (200) included with minPrice 100",
    minPriceIds.includes(variant4.id),
  );
  TestValidator.predicate(
    "variant5 (base_price 100) included with minPrice 100",
    minPriceIds.includes(variant5.id),
  );
  TestValidator.predicate(
    "variant1 (50) NOT included with minPrice 100",
    !minPriceIds.includes(variant1.id),
  );
  // 5. Test filtering by maxPrice only (should return variants with price <= 150)
  const maxPriceOnlyResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          maxPrice: 150,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(maxPriceOnlyResult);
  // Should include: variant1 (50), variant2 (100), variant3 (150), variant5 (base_price=100)
  TestValidator.equals(
    "maxPrice only returns 4 variants (<= 150)",
    maxPriceOnlyResult.data.length,
    4,
  );
  const maxPriceIds = maxPriceOnlyResult.data.map((v) => v.id);
  TestValidator.predicate(
    "variant1 (50) included with maxPrice 150",
    maxPriceIds.includes(variant1.id),
  );
  TestValidator.predicate(
    "variant2 (100) included with maxPrice 150",
    maxPriceIds.includes(variant2.id),
  );
  TestValidator.predicate(
    "variant3 (150) included with maxPrice 150",
    maxPriceIds.includes(variant3.id),
  );
  TestValidator.predicate(
    "variant5 (base_price 100) included with maxPrice 150",
    maxPriceIds.includes(variant5.id),
  );
  TestValidator.predicate(
    "variant4 (200) NOT included with maxPrice 150",
    !maxPriceIds.includes(variant4.id),
  );
  // 6. Test combined minPrice and maxPrice (should return variants within 80-180)
  const combinedResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          minPrice: 80,
          maxPrice: 180,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Should include: variant2 (100), variant3 (150), variant5 (base_price=100)
  // Excluded: variant1 (50), variant4 (200)
  TestValidator.equals(
    "combined range returns 3 variants (80-180)",
    combinedResult.data.length,
    3,
  );
  const combinedIds = combinedResult.data.map((v) => v.id);
  TestValidator.predicate(
    "variant2 (100) included in range 80-180",
    combinedIds.includes(variant2.id),
  );
  TestValidator.predicate(
    "variant3 (150) included in range 80-180",
    combinedIds.includes(variant3.id),
  );
  TestValidator.predicate(
    "variant5 (base_price 100) included in range 80-180",
    combinedIds.includes(variant5.id),
  );
  TestValidator.predicate(
    "variant1 (50) NOT included in range 80-180",
    !combinedIds.includes(variant1.id),
  );
  TestValidator.predicate(
    "variant4 (200) NOT included in range 80-180",
    !combinedIds.includes(variant4.id),
  );
  // 7. Test edge case: exact boundary values
  const exactBoundaryResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          minPrice: 100,
          maxPrice: 150,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(exactBoundaryResult);
  // Should include: variant2 (100), variant3 (150), variant5 (base_price=100)
  TestValidator.equals(
    "exact boundary returns 3 variants (100-150)",
    exactBoundaryResult.data.length,
    3,
  );
  const boundaryIds = exactBoundaryResult.data.map((v) => v.id);
  TestValidator.predicate(
    "variant2 (100) included with exact min boundary",
    boundaryIds.includes(variant2.id),
  );
  TestValidator.predicate(
    "variant3 (150) included with exact max boundary",
    boundaryIds.includes(variant3.id),
  );
  TestValidator.predicate(
    "variant5 (base_price 100) included with exact min boundary",
    boundaryIds.includes(variant5.id),
  );
  TestValidator.predicate(
    "variant1 (50) NOT included with min boundary 100",
    !boundaryIds.includes(variant1.id),
  );
  TestValidator.predicate(
    "variant4 (200) NOT included with max boundary 150",
    !boundaryIds.includes(variant4.id),
  );
}