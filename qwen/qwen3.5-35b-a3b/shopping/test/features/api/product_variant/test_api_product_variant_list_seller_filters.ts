import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_list_seller_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product for the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }) || null,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants with different attributes
  const skuCodes = [
    "SKU-001-A",
    "SKU-001-B",
    "SKU-002-A",
    "SKU-003-X",
    "SKU-100-Z",
    "SKU-200-Y",
  ];
  const sizes = ["Small", "Medium", "Large", "XL"] as const;
  const colors = ["Red", "Blue", "Green", "Black"] as const;
  const stockQuantities = [10, 25, 50, 0, 5, 100]; // Last one is out-of-stock
  const prices = [1500, 2000, 2500, 3000, 1200, 3500];
  const variants = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(6, (i) => i),
    async (i) => {
      const variant =
        await generate_random_ecommerce_mall_seller_products_variants_create(
          sellerConnection,
          {
            params: { productId: product.id },
            body: {
              sku_code: skuCodes[i],
              option_values: {
                size: sizes[i % sizes.length],
                color: colors[i % colors.length],
              } satisfies {
                [key: string]: string;
              },
              stock_quantity: stockQuantities[i],
              price_override: prices[i],
            } satisfies IEcommerceMallProductVariant.ICreate,
          },
        );
      typia.assert(variant);
      return variant;
    },
  );
  // 4. Test basic list retrieval and pagination metadata
  const allVariants =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(allVariants);
  TestValidator.equals(
    "total records matches created variants",
    allVariants.pagination.records,
    variants.length,
  );
  TestValidator.equals("current page is 1", allVariants.pagination.current, 1);
  TestValidator.equals("page count is 1", allVariants.pagination.pages, 1);
  TestValidator.equals("limit is respected", allVariants.pagination.limit, 10);
  // 5. Test SKU code partial match filter
  const skuFiltered =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { sku_code: "SKU-001" },
      },
    );
  typia.assert(skuFiltered);
  TestValidator.equals(
    "SKU filter returns 2 variants",
    skuFiltered.data.length,
    2,
  );
  skuFiltered.data.forEach((v) => {
    TestValidator.equals(
      "each SKU matches filter pattern",
      v.skuCode.startsWith("SKU-001"),
      true,
    );
  });
  // 6. Test minimum stock quantity filter (find available inventory)
  const stockFiltered =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { stock_quantity: 10 },
      },
    );
  typia.assert(stockFiltered);
  stockFiltered.data.forEach((v) => {
    TestValidator.predicate(
      "all variants have stock >= 10",
      v.stockQuantity >= 10,
    );
  });
  TestValidator.notEquals(
    "stock filter excludes out-of-stock variants",
    stockFiltered.data.some((v) => v.stockQuantity === 0),
    true,
  );
  // 7. Test out-of-stock variants (stock_quantity = 0)
  const outOfStockVariants =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { stock_quantity: 0 },
      },
    );
  typia.assert(outOfStockVariants);
  TestValidator.equals(
    "out-of-stock filter returns 1 variant",
    outOfStockVariants.data.length,
    1,
  );
  outOfStockVariants.data.forEach((v) => {
    TestValidator.equals(
      "out-of-stock variant has 0 stock",
      v.stockQuantity,
      0,
    );
  });
  // 8. Test option values filter
  const optionFiltered =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { option_values: { size: "Large" } },
      },
    );
  typia.assert(optionFiltered);
  optionFiltered.data.forEach((v) => {
    const parsedOptions: {
      [key: string]: string;
    } = JSON.parse(v.optionValues);
    TestValidator.equals(
      "option values match filter",
      parsedOptions.size,
      "Large",
    );
  });
  // 9. Test price range filter (minimum and maximum)
  const priceFiltered =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { price_min: 1500, price_max: 3000 },
      },
    );
  typia.assert(priceFiltered);
  priceFiltered.data.forEach((v) => {
    const price = v.priceOverride ?? product.base_price;
    TestValidator.predicate(
      "price is within range [1500, 3000]",
      price >= 1500 && price <= 3000,
    );
  });
  // 10. Test sorting by stock_quantity (ISummary does not have createdAt/updatedAt)
  const sortedByStock =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { order_by: "stock_quantity" },
      },
    );
  typia.assert(sortedByStock);
  for (let i = 1; i < sortedByStock.data.length; i++) {
    TestValidator.predicate(
      "stock_quantity is in ascending order",
      sortedByStock.data[i].stockQuantity >=
        sortedByStock.data[i - 1].stockQuantity,
    );
  }
  // 11. Test sorting by sku_code
  const sortedBySku =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { order_by: "sku_code" },
      },
    );
  typia.assert(sortedBySku);
  for (let i = 1; i < sortedBySku.data.length; i++) {
    TestValidator.predicate(
      "sku_code is in ascending order",
      sortedBySku.data[i].skuCode >= sortedBySku.data[i - 1].skuCode,
    );
  }
}
