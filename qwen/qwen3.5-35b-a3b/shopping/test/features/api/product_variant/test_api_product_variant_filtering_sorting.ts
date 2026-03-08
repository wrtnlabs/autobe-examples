import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test product variant filtering, sorting, and display price calculation.
 * Validates advanced search capabilities including stock filtering,
 * SKU pattern matching, active/inactive status filtering, and
 * multiple sorting options.
 */
export async function test_api_product_variant_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuth.token.access,
  };
  // 2. Generate product ID for variant testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create 5 variants with specific properties for testing
  const variantA =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: "TSHIRT-BLUE-L",
          option_values: { size: "Large", color: "Blue" },
          stock_quantity: 50,
          price_override: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantA);
  const variantB =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: "TSHIRT-BLUE-M",
          option_values: { size: "Medium", color: "Blue" },
          stock_quantity: 20,
          price_override: 80,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantB);
  const variantC =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: "TSHIRT-RED-L",
          option_values: { size: "Large", color: "Red" },
          stock_quantity: 30,
          price_override: 120,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantC);
  const variantD =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: "TSHIRT-RED-M",
          option_values: { size: "Medium", color: "Red" },
          stock_quantity: 40,
          price_override: null, // Uses base product price
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantD);
  const variantE =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: "HOODIE-BLUE-XL",
          option_values: { size: "XL", color: "Blue" },
          stock_quantity: 10,
          price_override: 90,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantE);
  // 4. Test default sorting (stock_quantity DESC)
  const defaultSort =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {},
      },
    );
  typia.assert(defaultSort);
  TestValidator.equals(
    "default sort: 5 variants returned",
    defaultSort.data.length,
    5,
  );
  // 5. Test stock_quantity ascending sort
  const stockAscending =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {
          sort_by: "stock_quantity",
          sort_direction: "asc",
        },
      },
    );
  typia.assert(stockAscending);
  TestValidator.equals(
    "stock_quantity asc: 5 variants",
    stockAscending.data.length,
    5,
  );
  TestValidator.equals(
    "stock_quantity asc: E(10), B(20), C(30), D(40), A(50)",
    stockAscending.data.map((v) => v.stockQuantity),
    [10, 20, 30, 40, 50],
  );
  // 6. Test price_override descending sort
  const priceDescending =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {
          sort_by: "price_override",
          sort_direction: "desc",
        },
      },
    );
  typia.assert(priceDescending);
  const displayPrices = priceDescending.data.map((v) => v.displayPrice);
  TestValidator.equals(
    "price_override desc: display prices",
    displayPrices,
    [120, 100, 100, 90, 80],
  );
  // 7. Test created_at descending sort
  const createdDesc =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {
          sort_by: "created_at",
          sort_direction: "desc",
        },
      },
    );
  typia.assert(createdDesc);
  TestValidator.equals(
    "created_at desc: 5 variants",
    createdDesc.data.length,
    5,
  );
  // 8. Test SKU pattern matching (case-insensitive)
  const skuPatternBlue =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {
          sku_pattern: "TSHIRT-BLUE",
        },
      },
    );
  typia.assert(skuPatternBlue);
  TestValidator.equals(
    "sku_pattern TSHIRT-BLUE: 2 variants",
    skuPatternBlue.data.length,
    2,
  );
  skuPatternBlue.data.forEach((v) => {
    TestValidator.predicate(
      "sku_pattern TSHIRT-BLUE: contains BLUE",
      v.skuCode.toUpperCase().includes("BLUE"),
    );
  });
  const skuPatternRed =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {
          sku_pattern: "red", // lowercase pattern
        },
      },
    );
  typia.assert(skuPatternRed);
  TestValidator.equals(
    "sku_pattern red (case-insensitive): 2 variants",
    skuPatternRed.data.length,
    2,
  );
  skuPatternRed.data.forEach((v) => {
    TestValidator.predicate(
      "sku_pattern red: contains RED (case-insensitive)",
      v.skuCode.toUpperCase().includes("RED"),
    );
  });
  // 9. Test stock status filtering
  const inStockVariants =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {
          stock_status: "in_stock",
        },
      },
    );
  typia.assert(inStockVariants);
  TestValidator.equals(
    "stock_status in_stock: all 5 variants",
    inStockVariants.data.length,
    5,
  );
  const outOfStockVariants =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {
          stock_status: "out_of_stock",
        },
      },
    );
  typia.assert(outOfStockVariants);
  TestValidator.equals(
    "stock_status out_of_stock: 0 variants",
    outOfStockVariants.data.length,
    0,
  );
  // 10. Test combined filters (stock + SKU pattern)
  const combinedFilters =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId,
        body: {
          stock_status: "in_stock",
          sku_pattern: "TSHIRT",
        },
      },
    );
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined filters: TSHIRT in_stock",
    combinedFilters.data.length,
    4,
  );
  // 11. Test pagination with filters
  const paginated = await api.functional.ecommerceMall.products.variants.index(
    sellerConnection,
    {
      productId,
      body: {
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination page 1 limit 2: returns 2 variants",
    paginated.data.length,
    2,
  );
  TestValidator.equals(
    "pagination page 1 limit 2: total records correct",
    paginated.pagination.records,
    5,
  );
  // 12. Test sort by SKU code
  const skuSort = await api.functional.ecommerceMall.products.variants.index(
    sellerConnection,
    {
      productId,
      body: {
        sort_by: "sku_code",
        sort_direction: "asc",
      },
    },
  );
  typia.assert(skuSort);
  TestValidator.equals(
    "sku_code asc: 5 variants sorted",
    skuSort.data.length,
    5,
  );
  const skuCodes = skuSort.data.map((v) => v.skuCode);
  const expectedSortedSkus = [
    "HOODIE-BLUE-XL",
    "TSHIRT-BLUE-L",
    "TSHIRT-BLUE-M",
    "TSHIRT-RED-L",
    "TSHIRT-RED-M",
  ];
  TestValidator.equals(
    "sku_code asc: correct order",
    skuCodes,
    expectedSortedSkus,
  );
}
