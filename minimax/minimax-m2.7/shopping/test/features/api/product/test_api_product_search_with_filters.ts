import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://test.com",
      referrer: "https://google.com",
    },
  });
  // Create new connection with seller's token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  // 2. Create a product for search testing
  const searchTerm = "PREMIUM_TEST_WIDGET";
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedConnection,
    {
      body: {
        name: searchTerm,
        description:
          "A special premium widget for testing search functionality",
        basePrice: 9999,
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with stock
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      authenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 14999,
          quantity: 10,
          optionValues: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. Add inventory to make variant in-stock
  const inventory =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      authenticatedConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 10,
          operationType: "restock",
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory);
  // 5. Test product search with filters using PATCH /ecommerceMall/products
  // Test search by name (case-insensitive partial match)
  const searchByName = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        q: "PREMIUM",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchByName);
  // Validate search results structure
  TestValidator.equals(
    "has pagination data",
    searchByName.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has pagination data",
    searchByName.pagination !== undefined,
  );
  // Validate product summary fields
  if (searchByName.data.length > 0) {
    const searchedProduct = searchByName.data[0];
    TestValidator.predicate("has id", searchedProduct.id !== undefined);
    TestValidator.predicate("has name", searchedProduct.name !== undefined);
    TestValidator.predicate(
      "has basePrice",
      searchedProduct.basePrice !== undefined,
    );
    TestValidator.predicate(
      "has category",
      searchedProduct.category !== undefined,
    );
    TestValidator.predicate(
      "has thumbnailUrl",
      searchedProduct.thumbnailUrl !== undefined,
    );
    TestValidator.predicate(
      "has minVariantPrice",
      searchedProduct.minVariantPrice !== undefined,
    );
    TestValidator.predicate(
      "has maxVariantPrice",
      searchedProduct.maxVariantPrice !== undefined,
    );
    TestValidator.predicate(
      "has hasStock",
      searchedProduct.hasStock !== undefined,
    );
    TestValidator.predicate(
      "has shopName",
      searchedProduct.shopName !== undefined,
    );
    TestValidator.predicate(
      "has averageRating",
      searchedProduct.averageRating !== undefined,
    );
    TestValidator.predicate(
      "has reviewsCount",
      searchedProduct.reviewsCount !== undefined,
    );
    TestValidator.predicate(
      "has createdAt",
      searchedProduct.createdAt !== undefined,
    );
  }
  // 6. Test search with category filter
  const searchWithCategory = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        categoryId: product.category.id,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchWithCategory);
  TestValidator.predicate(
    "category filter returns results",
    searchWithCategory.data.length >= 1,
  );
  // 7. Test search with price range filter
  const searchWithPriceRange =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        minPrice: 5000,
        maxPrice: 20000,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(searchWithPriceRange);
  TestValidator.predicate(
    "price range filter returns results",
    searchWithPriceRange.data.length >= 1,
  );
  // 8. Test search with inStock filter
  const searchInStock = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        inStock: true,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchInStock);
  TestValidator.predicate(
    "inStock filter returns results",
    searchInStock.data.length >= 1,
  );
  // Validate that in-stock products have hasStock = true
  if (searchInStock.data.length > 0) {
    const inStockProduct = searchInStock.data.find((p) => p.id === product.id);
    if (inStockProduct) {
      TestValidator.equals(
        "product with inventory has stock",
        inStockProduct.hasStock,
        true,
      );
    }
  }
  // 9. Test combined filters
  const searchCombined = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        q: "PREMIUM",
        categoryId: product.category.id,
        minPrice: 5000,
        maxPrice: 20000,
        inStock: true,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchCombined);
  TestValidator.predicate(
    "combined filters return results",
    searchCombined.data.length >= 1,
  );
  // 10. Test pagination - validate that pagination works with limit param
  const searchPaginated = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchPaginated);
  TestValidator.predicate(
    "pagination exists",
    searchPaginated.pagination !== null && searchPaginated.pagination !== undefined,
  );
  // 11. Test sorting options
  const searchSortedNewest = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchSortedNewest);
  const searchSortedPriceAsc =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        sort: "price_asc",
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(searchSortedPriceAsc);
  const searchSortedPriceDesc =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        sort: "price_desc",
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(searchSortedPriceDesc);
}