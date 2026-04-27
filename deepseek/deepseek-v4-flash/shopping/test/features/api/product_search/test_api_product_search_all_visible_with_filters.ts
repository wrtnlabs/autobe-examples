import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_all_visible_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search all visible products without filters (pagination only)
  const result1 =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result1);
  TestValidator.equals("page 1 current", result1.pagination.current, 1);
  TestValidator.equals("page 1 limit", result1.pagination.limit, 10);
  TestValidator.predicate(
    "has non-negative records",
    result1.pagination.records >= 0,
  );
  // If no data in the system, skip further filtering tests
  if (result1.pagination.records === 0) {
    TestValidator.equals("pages is 0", result1.pagination.pages, 0);
    return;
  }
  // Validate each product summary structure
  for (const product of result1.data) {
    typia.assert(product);
    TestValidator.equals(
      "only visible products",
      product.visibility,
      "visible",
    );
  }
  // Find a product with a non-null category to use for filtering
  const productWithCategory = result1.data.find((p) => p.category !== null);
  if (productWithCategory === undefined) {
    // No products with categories exist, skip category filter tests
    return;
  }
  const categoryId = productWithCategory.category!.id;
  // 3. Filter by category
  const result2 =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          categoryId: categoryId,
        },
      },
    );
  typia.assert(result2);
  for (const product of result2.data) {
    typia.assert(product);
    TestValidator.predicate(
      `product ${product.id} belongs to category ${categoryId}`,
      () => product.category !== null && product.category!.id === categoryId,
    );
  }
  // 4. Filter by category + price range (AND logic)
  const minPrice = 10.0;
  const maxPrice = 50.0;
  const result3 =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          categoryId: categoryId,
          minPrice: minPrice,
          maxPrice: maxPrice,
        },
      },
    );
  typia.assert(result3);
  for (const product of result3.data) {
    typia.assert(product);
    TestValidator.predicate(
      `product category match`,
      () => product.category !== null && product.category!.id === categoryId,
    );
    TestValidator.predicate(
      `product price in range`,
      () => product.base_price >= minPrice && product.base_price <= maxPrice,
    );
  }
  // 5. Search with non-existent category UUID (simulating deleted category)
  const nonExistentCategoryId = "00000000-0000-4000-8000-000000000000";
  const result4 =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          categoryId: nonExistentCategoryId,
        },
      },
    );
  typia.assert(result4);
  TestValidator.equals(
    "no records for non-existent category",
    result4.pagination.records,
    0,
  );
  TestValidator.equals(
    "no data for non-existent category",
    result4.data.length,
    0,
  );
  TestValidator.equals("pages is 0", result4.pagination.pages, 0);
}
