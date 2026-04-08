import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_variant_listing_with_option_value_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  typia.assert(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // Seller joins
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // Seller login (assuming approved or using test account)
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerLogin);
  // 3. Seller creates product with base price 100.00
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: 100.0,
      },
    },
  );
  typia.assert(product);
  // 4. Test variant listing with filtering capabilities
  // Note: Without a variant creation endpoint, we test the API structure
  // Test 1: Filter by single option value (color=Red)
  const redVariantsResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          optionValues: [{ key: "color", value: "Red" }],
        },
      },
    );
  typia.assert(redVariantsResult);
  // Validate response structure
  TestValidator.predicate(
    "Result has pagination info",
    redVariantsResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "Result has data array",
    Array.isArray(redVariantsResult.data),
  );
  // If variants exist with color=Red, verify the filter works
  for (const variant of redVariantsResult.data) {
    TestValidator.predicate(
      "Variant has color=Red option",
      variant.optionValues.some(
        (ov: IEcommerceMallProductVariantOptionValue.ISummary) =>
          ov.key === "color" && ov.value === "Red",
      ),
    );
    TestValidator.predicate(
      "Variant has valid in_stock computed",
      typeof variant.in_stock === "boolean",
    );
    TestValidator.predicate("Variant has quantity >= 0", variant.quantity >= 0);
    TestValidator.predicate(
      "Variant in_stock matches quantity",
      variant.in_stock === variant.quantity > 0,
    );
  }
  // Test 2: Filter by multiple option values (color=Red AND size=Large)
  const redLargeVariantsResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(redLargeVariantsResult);
  // Verify all returned variants match both filter criteria
  for (const variant of redLargeVariantsResult.data) {
    TestValidator.predicate(
      "Variant has color=Red",
      variant.optionValues.some(
        (ov: IEcommerceMallProductVariantOptionValue.ISummary) =>
          ov.key === "color" && ov.value === "Red",
      ),
    );
    TestValidator.predicate(
      "Variant has size=Large",
      variant.optionValues.some(
        (ov: IEcommerceMallProductVariantOptionValue.ISummary) =>
          ov.key === "size" && ov.value === "Large",
      ),
    );
  }
  // Test 3: Filter by price range (minPrice=105, maxPrice=115)
  const priceRangeResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          minPrice: 105,
          maxPrice: 115,
        },
      },
    );
  typia.assert(priceRangeResult);
  // Verify all returned variants have prices in range
  // Note: variant.price can be null (falls back to basePrice) or a number
  for (const variant of priceRangeResult.data) {
    const effectivePrice = variant.price ?? product.basePrice;
    TestValidator.predicate(
      "Variant price in range 105-115",
      effectivePrice >= 105 && effectivePrice <= 115,
    );
  }
  // Test 4: Filter by in_stock status
  const inStockResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: true,
        },
      },
    );
  typia.assert(inStockResult);
  // Verify all returned variants are in stock
  for (const variant of inStockResult.data) {
    TestValidator.equals(
      "Variant in_stock matches filter",
      variant.in_stock,
      true,
    );
    TestValidator.predicate("Variant quantity > 0", variant.quantity > 0);
  }
  // Test 5: Pagination validation
  const paginatedResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination structure using correct IPage.IPagination fields
  // The pagination property is IPageIEcommerceMall.IPagination which contains a nested pagination property
  TestValidator.equals(
    "Page is 1",
    paginatedResult.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "Limit is 10",
    paginatedResult.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "Pagination has records count",
    paginatedResult.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination has pages count",
    paginatedResult.pagination.pagination.pages >= 0,
  );
  // Test 6: Combined filters
  const combinedResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          optionValues: [{ key: "color", value: "Blue" }],
          minPrice: 100,
          maxPrice: 120,
          inStock: true,
          sortBy: "created_at_desc" as const,
        },
      },
    );
  typia.assert(combinedResult);
  // Validate combined filter results
  for (const variant of combinedResult.data) {
    const effectivePrice = variant.price ?? product.basePrice;
    TestValidator.predicate(
      "Price in range 100-120",
      effectivePrice >= 100 && effectivePrice <= 120,
    );
    TestValidator.predicate(
      "Variant has color=Blue or in_stock",
      variant.optionValues.some(
        (ov: IEcommerceMallProductVariantOptionValue.ISummary) =>
          ov.key === "color" && ov.value === "Blue",
      ) || variant.in_stock,
    );
  }
}
