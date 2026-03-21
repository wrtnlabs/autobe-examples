import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_search_in_stock_filter_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up admin account for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Set up seller account for product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create category for products
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Create products with different stock scenarios
  // Product 1: With stock (has variant with quantity > 0)
  const productWithStock =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
          name: "Product With Stock",
          description: "This product has variants with available stock",
          base_price: 1000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(productWithStock);
  const variantWithStock =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productWithStock.id },
        body: {
          sku_code: `SKU-WITH-STOCK-${RandomGenerator.alphaNumeric(8)}`,
          quantity: 0,
          option_values: [
            {
              key: "color",
              value: "red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantWithStock);
  // Add inventory to make it available
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: productWithStock.id,
        variantId: variantWithStock.id,
      },
      body: {
        operation: "restock",
        quantity: 10,
        reason: "Initial stock for testing",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // Product 2: Without stock (variant with quantity = 0)
  const productWithoutStock =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
          name: "Product Without Stock",
          description: "This product has variants but no available stock",
          base_price: 2000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(productWithoutStock);
  const variantWithoutStock =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productWithoutStock.id },
        body: {
          sku_code: `SKU-WITHOUT-STOCK-${RandomGenerator.alphaNumeric(8)}`,
          quantity: 0,
          option_values: [
            {
              key: "size",
              value: "large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantWithoutStock);
  // Product 3: Another product with stock
  const productWithStock2 =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
          name: "Another Product With Stock",
          description: "This is another product with available stock",
          base_price: 3000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(productWithStock2);
  const variantWithStock2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productWithStock2.id },
        body: {
          sku_code: `SKU-STOCK-2-${RandomGenerator.alphaNumeric(8)}`,
          quantity: 0,
          option_values: [
            {
              key: "style",
              value: "classic",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantWithStock2);
  // Add inventory to second product
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: productWithStock2.id,
        variantId: variantWithStock2.id,
      },
      body: {
        operation: "restock",
        quantity: 5,
        reason: "Initial stock for testing",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 5. Search without in-stock filter (guest can search)
  const guestConnection: api.IConnection = { host: connection.host };
  const allProductsSearch = await api.functional.ecommerceMall.products.search(
    guestConnection,
    {
      body: {
        categoryId: category.id,
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(allProductsSearch);
  // Verify all 3 products appear
  TestValidator.equals(
    "all products count should be 3",
    allProductsSearch.data.length,
    3,
  );
  // 6. Search with in-stock=true filter
  const inStockSearch = await api.functional.ecommerceMall.products.search(
    guestConnection,
    {
      body: {
        categoryId: category.id,
        inStock: true,
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(inStockSearch);
  // Verify only products with stock appear (Product Without Stock should be excluded)
  TestValidator.equals(
    "in-stock products should exclude out-of-stock",
    inStockSearch.data.length,
    2,
  );
  // Verify the product without stock is not in results
  const productIdsWithStock = inStockSearch.data.map((p) => p.id);
  TestValidator.predicate(
    "product without stock should not appear",
    !productIdsWithStock.includes(productWithoutStock.id),
  );
  // 7. Search with in-stock=false to verify only out-of-stock appears
  const outOfStockSearch = await api.functional.ecommerceMall.products.search(
    guestConnection,
    {
      body: {
        categoryId: category.id,
        inStock: false,
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(outOfStockSearch);
  // Verify only the out-of-stock product appears
  TestValidator.equals(
    "out-of-stock products count",
    outOfStockSearch.data.length,
    1,
  );
  TestValidator.equals(
    "only out-of-stock product should appear",
    outOfStockSearch.data[0]?.id,
    productWithoutStock.id,
  );
  // 8. Test pagination with in-stock filter
  const paginatedSearchPage1 =
    await api.functional.ecommerceMall.products.search(guestConnection, {
      body: {
        categoryId: category.id,
        inStock: true,
        sort: "newest",
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(paginatedSearchPage1);
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 should have 1 record",
    paginatedSearchPage1.data.length,
    1,
  );
  TestValidator.equals(
    "total records should be 2",
    paginatedSearchPage1.pagination.records,
    2,
  );
  TestValidator.equals(
    "total pages should be 2",
    paginatedSearchPage1.pagination.pages,
    2,
  );
  TestValidator.equals(
    "current page should be 1",
    paginatedSearchPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 1",
    paginatedSearchPage1.pagination.limit,
    1,
  );
  // 9. Request page 2
  const paginatedSearchPage2 =
    await api.functional.ecommerceMall.products.search(guestConnection, {
      body: {
        categoryId: category.id,
        inStock: true,
        sort: "newest",
        page: 2,
        limit: 1,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(paginatedSearchPage2);
  // Validate page 2
  TestValidator.equals(
    "page 2 should have 1 record",
    paginatedSearchPage2.data.length,
    1,
  );
  TestValidator.equals(
    "current page should be 2",
    paginatedSearchPage2.pagination.current,
    2,
  );
  // Verify different products appear on different pages
  TestValidator.predicate(
    "page 1 and page 2 should have different products",
    paginatedSearchPage1.data[0]?.id !== paginatedSearchPage2.data[0]?.id,
  );
  // 10. Test pagination without in-stock filter (all products)
  const allPaginatedPage1 = await api.functional.ecommerceMall.products.search(
    guestConnection,
    {
      body: {
        categoryId: category.id,
        sort: "newest",
        page: 1,
        limit: 2,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(allPaginatedPage1);
  TestValidator.equals(
    "all products page 1 should have 2 records",
    allPaginatedPage1.data.length,
    2,
  );
  TestValidator.equals(
    "total records should be 3",
    allPaginatedPage1.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages should be 2",
    allPaginatedPage1.pagination.pages,
    2,
  );
  const allPaginatedPage2 = await api.functional.ecommerceMall.products.search(
    guestConnection,
    {
      body: {
        categoryId: category.id,
        sort: "newest",
        page: 2,
        limit: 2,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(allPaginatedPage2);
  TestValidator.equals(
    "all products page 2 should have 1 record",
    allPaginatedPage2.data.length,
    1,
  );
}
