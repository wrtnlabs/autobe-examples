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

export async function test_api_product_variant_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product to serve as parent for variants
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create multiple product variants with different options
  await ArrayUtil.asyncRepeat(5, async (index) => {
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-${index}`,
          price: 1000 + index * 100,
          quantity: 10 + index * 5,
          option_values: [
            {
              key: "color",
              value: index % 2 === 0 ? "Red" : "Blue",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: index % 3 === 0 ? "Large" : "Small",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  });
  // Wait a bit to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Retrieve paginated list of variants (page 1)
  const page1 =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 2,
          page: 1,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("limit is 2", page1.pagination.limit, 2);
  TestValidator.predicate("total records >= 5", page1.pagination.records >= 5);
  TestValidator.predicate("total pages >= 3", page1.pagination.pages >= 3);
  TestValidator.equals("page 1 has 2 items", page1.data.length, 2);
  // Validate variant structure in response
  for (const variant of page1.data) {
    TestValidator.predicate("variant has id", !!variant.id);
    TestValidator.predicate("variant has sku_code", !!variant.sku_code);
    TestValidator.predicate(
      "variant has quantity",
      typeof variant.quantity === "number",
    );
    TestValidator.predicate("variant has created_at", !!variant.created_at);
    TestValidator.predicate(
      "variant has optionValues array",
      Array.isArray(variant.optionValues),
    );
  }
  // 5. Verify sorting - newest first (created_at descending)
  if (page1.data.length >= 2) {
    const first = new Date(page1.data[0].created_at).getTime();
    const second = new Date(page1.data[1].created_at).getTime();
    TestValidator.predicate("newest variant first", first >= second);
  }
  // 6. Retrieve page 2 to verify pagination works
  const page2 =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 2,
          page: 2,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 has 2 items", page2.data.length, 2);
  // 7. Verify page 1 and page 2 have different variants
  const page1Ids = page1.data.map((v) => v.id);
  const page2Ids = page2.data.map((v) => v.id);
  for (const id of page1Ids) {
    TestValidator.predicate(
      "page 2 doesn't contain page 1 variants",
      !page2Ids.includes(id),
    );
  }
  // 8. Test filtering by in-stock
  const inStockPage =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 10,
          page: 1,
          inStock: true,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockPage);
  for (const variant of inStockPage.data) {
    TestValidator.predicate(
      "in-stock variant has quantity > 0",
      variant.quantity > 0,
    );
  }
  // 9. Test price range filtering
  const priceFilteredPage =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 10,
          page: 1,
          minPrice: 1100,
          maxPrice: 1300,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(priceFilteredPage);
  for (const variant of priceFilteredPage.data) {
    const price = variant.price ?? product.base_price;
    TestValidator.predicate(
      "price within range",
      price >= 1100 && price <= 1300,
    );
  }
  // 10. Verify all variants have unique SKUs
  const allSkus = [...page1.data, ...page2.data].map((v) => v.sku_code);
  const uniqueSkus = new Set(allSkus);
  TestValidator.equals("all SKUs are unique", uniqueSkus.size, allSkus.length);
}
