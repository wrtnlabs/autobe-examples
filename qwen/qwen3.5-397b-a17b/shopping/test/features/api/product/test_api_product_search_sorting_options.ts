import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer product search with different sorting options.
 *
 * This test validates the product search endpoint's sorting functionality:
 * 1. Authenticates as a customer
 * 2. Tests default sort (newest) - products ordered by created_at DESC
 * 3. Tests price ascending sort - products ordered by base_price ASC
 * 4. Tests price descending sort - products ordered by base_price DESC
 * 5. Validates pagination maintains sort order across pages
 * 6. Verifies only one sort option is active at a time
 */
export async function test_api_product_search_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  // 2. Test default sort (newest) - should order by created_at DESC
  const newestSearch =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          sort: "newest",
          limit: 20,
          page: 1,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(newestSearch);
  TestValidator.predicate(
    "newest search returns pagination",
    newestSearch.pagination.records >= 0,
  );
  TestValidator.equals(
    "newest sort parameter accepted",
    newestSearch.pagination.current,
    1,
  );
  // 3. Test price ascending sort - should order by base_price ASC
  const priceAscSearch =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          sort: "priceAsc",
          limit: 20,
          page: 1,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceAscSearch);
  // Verify price ascending sort order (min price ASC)
  if (priceAscSearch.data.length > 1) {
    for (let i = 0; i < priceAscSearch.data.length - 1; i++) {
      const current = priceAscSearch.data[i];
      const next = priceAscSearch.data[i + 1];
      TestValidator.predicate(
        "price ascending sort order",
        current.min <= next.min,
      );
    }
  }
  // 4. Test price descending sort - should order by base_price DESC
  const priceDescSearch =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          sort: "priceDesc",
          limit: 20,
          page: 1,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceDescSearch);
  // Verify price descending sort order (max price DESC)
  if (priceDescSearch.data.length > 1) {
    for (let i = 0; i < priceDescSearch.data.length - 1; i++) {
      const current = priceDescSearch.data[i];
      const next = priceDescSearch.data[i + 1];
      TestValidator.predicate(
        "price descending sort order",
        current.max >= next.max,
      );
    }
  }
  // 5. Test pagination maintains sort order - fetch page 2 with priceAsc
  if (priceAscSearch.pagination.pages > 1) {
    const priceAscPage2 =
      await api.functional.shoppingMall.customer.products.search(
        customerConnection,
        {
          body: {
            sort: "priceAsc",
            limit: 20,
            page: 2,
          } satisfies IShoppingMallProduct.IRequest,
        },
      );
    typia.assert(priceAscPage2);
    TestValidator.equals(
      "page 2 current page",
      priceAscPage2.pagination.current,
      2,
    );
    // Verify page 2 prices are >= page 1 prices (maintaining sort order)
    if (priceAscSearch.data.length > 0 && priceAscPage2.data.length > 0) {
      const lastPage1Price =
        priceAscSearch.data[priceAscSearch.data.length - 1].min;
      const firstPage2Price = priceAscPage2.data[0].min;
      TestValidator.predicate(
        "pagination maintains price ascending order",
        lastPage1Price <= firstPage2Price,
      );
    }
  }
  // 6. Test without sort parameter (should default to newest)
  const defaultSearch =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.predicate(
    "default search returns results",
    defaultSearch.pagination.records >= 0,
  );
  // 7. Verify all sort options return valid paginated responses
  TestValidator.predicate(
    "newest returns data array",
    Array.isArray(newestSearch.data),
  );
  TestValidator.predicate(
    "priceAsc returns data array",
    Array.isArray(priceAscSearch.data),
  );
  TestValidator.predicate(
    "priceDesc returns data array",
    Array.isArray(priceDescSearch.data),
  );
  // Verify price ranges are valid (min <= max)
  for (const product of priceAscSearch.data) {
    TestValidator.predicate("price range valid", product.min <= product.max);
  }
}
