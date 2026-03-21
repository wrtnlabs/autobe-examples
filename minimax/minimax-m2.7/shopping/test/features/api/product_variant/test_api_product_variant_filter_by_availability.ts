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

export async function test_api_product_variant_filter_by_availability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create in-stock variants (quantity > 0)
  const inStockVariants = await Promise.all([
    generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `IN-STOCK-1-${RandomGenerator.alphaNumeric(6)}`,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    ),
    generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `IN-STOCK-2-${RandomGenerator.alphaNumeric(6)}`,
          quantity: 25,
          option_values: [
            {
              key: "color",
              value: "blue",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    ),
  ]);
  inStockVariants.forEach((v) => typia.assert(v));
  // 4. Create out-of-stock variants (quantity = 0)
  const outOfStockVariants = await Promise.all([
    generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `OUT-STOCK-1-${RandomGenerator.alphaNumeric(6)}`,
          quantity: 0,
          option_values: [
            {
              key: "color",
              value: "green",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    ),
    generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `OUT-STOCK-2-${RandomGenerator.alphaNumeric(6)}`,
          quantity: 0,
          option_values: [
            {
              key: "color",
              value: "black",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    ),
  ]);
  outOfStockVariants.forEach((v) => typia.assert(v));
  // 5. Test filter with inStock=true - should return only in-stock variants
  const inStockResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: true,
          limit: 100,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockResult);
  // Validate: only in-stock variants should be returned
  TestValidator.equals(
    "inStock=true returns only variants with quantity > 0",
    inStockResult.data.length,
    inStockVariants.length,
  );
  TestValidator.equals(
    "first in-stock variant found",
    inStockResult.data.some((v) => v.sku_code === inStockVariants[0].sku_code),
    true,
  );
  TestValidator.equals(
    "second in-stock variant found",
    inStockResult.data.some((v) => v.sku_code === inStockVariants[1].sku_code),
    true,
  );
  TestValidator.equals(
    "out-of-stock variants NOT included when inStock=true",
    inStockResult.data.some(
      (v) => v.sku_code === outOfStockVariants[0].sku_code,
    ),
    false,
  );
  TestValidator.equals(
    "out-of-stock variants NOT included when inStock=true",
    inStockResult.data.some(
      (v) => v.sku_code === outOfStockVariants[1].sku_code,
    ),
    false,
  );
  // 6. Test filter with inStock=false - should return all variants including out-of-stock
  const allVariantsResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: false,
          limit: 100,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(allVariantsResult);
  // Validate: all variants should be returned
  TestValidator.equals(
    "inStock=false returns all variants",
    allVariantsResult.data.length,
    inStockVariants.length + outOfStockVariants.length,
  );
  TestValidator.equals(
    "all in-stock variants found",
    allVariantsResult.data.some(
      (v) => v.sku_code === inStockVariants[0].sku_code,
    ),
    true,
  );
  TestValidator.equals(
    "all in-stock variants found",
    allVariantsResult.data.some(
      (v) => v.sku_code === inStockVariants[1].sku_code,
    ),
    true,
  );
  TestValidator.equals(
    "out-of-stock variants included when inStock=false",
    allVariantsResult.data.some(
      (v) => v.sku_code === outOfStockVariants[0].sku_code,
    ),
    true,
  );
  TestValidator.equals(
    "out-of-stock variants included when inStock=false",
    allVariantsResult.data.some(
      (v) => v.sku_code === outOfStockVariants[1].sku_code,
    ),
    true,
  );
  // 7. Test without inStock filter - should return all variants (default behavior)
  const noFilterResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 100,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(noFilterResult);
  // Validate: all variants should be returned (same as inStock=false)
  TestValidator.equals(
    "no filter returns all variants",
    noFilterResult.data.length,
    inStockVariants.length + outOfStockVariants.length,
  );
}
