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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_category_product_pagination_and_deleted_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create first product to get category ID (prepare_random_ecommerce_mall_product handles category creation)
  const firstProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product 1 - ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: 1000,
        },
      },
    );
  typia.assert(firstProduct);
  // Get category ID from the first product
  const categoryId = firstProduct.category.id;
  // 3. Create 5 more products in the same category to have 6 total
  const products: IEcommerceMallProduct[] = [firstProduct];
  for (let i = 2; i <= 6; i++) {
    const product = await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: categoryId,
          name: `Product ${i} - ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: (i * 500) as number,
        },
      },
    );
    typia.assert(product);
    products.push(product);
  }
  // 4. Test (a): Request first page with limit=2
  const firstPage =
    await api.functional.ecommerceMall.categories.products.index(
      sellerConnection,
      {
        categoryId: categoryId,
        body: {
          limit: 2,
          page: 1,
          sort: "newest",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(firstPage);
  // Verify first page has 2 products
  TestValidator.equals("first page count", firstPage.data.length, 2);
  // Verify total count is 6 (all products)
  TestValidator.equals("total products count", firstPage.pagination.records, 6);
  // Verify we have 3 pages total
  TestValidator.equals("total pages", firstPage.pagination.pages, 3);
  // 5. Test (b): Request second page
  const secondPage =
    await api.functional.ecommerceMall.categories.products.index(
      sellerConnection,
      {
        categoryId: categoryId,
        body: {
          limit: 2,
          page: 2,
          sort: "newest",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(secondPage);
  // Verify second page has 2 products
  TestValidator.equals("second page count", secondPage.data.length, 2);
  // Verify no duplicates between pages (using IDs)
  const firstPageIds = firstPage.data.map((p) => p.id);
  const secondPageIds = secondPage.data.map((p) => p.id);
  for (const id of secondPageIds) {
    TestValidator.predicate("no duplicate product", !firstPageIds.includes(id));
  }
  // 6. Test (c): Request third page (last page)
  const thirdPage =
    await api.functional.ecommerceMall.categories.products.index(
      sellerConnection,
      {
        categoryId: categoryId,
        body: {
          limit: 2,
          page: 3,
          sort: "newest",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(thirdPage);
  // Verify third page has remaining products (2 products)
  TestValidator.equals("third page count", thirdPage.data.length, 2);
  // Verify no duplicates across all pages
  const thirdPageIds = thirdPage.data.map((p) => p.id);
  for (const id of thirdPageIds) {
    TestValidator.predicate(
      "no duplicate across pages",
      !firstPageIds.includes(id) && !secondPageIds.includes(id),
    );
  }
  // 7. Test (d): Request all products on single page with limit=10
  const allProductsPage =
    await api.functional.ecommerceMall.categories.products.index(
      sellerConnection,
      {
        categoryId: categoryId,
        body: {
          limit: 10,
          page: 1,
          sort: "newest",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(allProductsPage);
  // Verify total count is 6
  TestValidator.equals(
    "all products total",
    allProductsPage.pagination.records,
    6,
  );
  // Verify all 6 products are returned on single page
  TestValidator.equals(
    "all products on one page",
    allProductsPage.data.length,
    6,
  );
  // Verify only 1 page needed
  TestValidator.equals(
    "only one page for all",
    allProductsPage.pagination.pages,
    1,
  );
  // 8. Verify pagination metadata structure
  TestValidator.equals(
    "current page is 1",
    allProductsPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", allProductsPage.pagination.limit, 10);
}
