import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * This test validates the ability of a guest user to authenticate, register as
 * a guest customer, and retrieve a filtered, paginated list of shopping mall
 * products.
 *
 * Steps to be performed:
 *
 * 1. Authenticate as a guest user via POST /auth/guest/join to obtain a temporary
 *    session token and authorization.
 * 2. Create a guest customer via POST /shoppingMall/guest/customers to satisfy the
 *    prerequisite for product searching.
 * 3. Perform a PATCH /shoppingMall/guest/shoppingMallProducts request to retrieve
 *    a paginated, unfiltered product list.
 * 4. Validate response data types using typia.assert and ensure pagination
 *    metadata correctness.
 */
export async function test_api_shopping_mall_product_list_by_guest_with_registered_guest_account(
  connection: api.IConnection,
) {
  // Step 1: Guest authentication via /auth/guest/join
  const guestJoinBody: IShoppingMallGuest.IJoin = {
    name: RandomGenerator.name(),
    href: `https://example.com/products`,
    referrer: `https://example.com`,
  };

  const guestAuthorized: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestJoinBody,
    });
  typia.assert(guestAuthorized);

  // Step 2: Create guest customer
  const guestCustomerCreateBody: IShoppingMallCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    full_name: RandomGenerator.name(),
    href: guestJoinBody.href,
    referrer: guestJoinBody.referrer,
  };

  const guestCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.guest.customers.create(connection, {
      body: guestCustomerCreateBody,
    });
  typia.assert(guestCustomer);

  // Step 3: Paginated product search without seller filter
  const productSearchBody0: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
  };

  const productPage0: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.guest.shoppingMallProducts.index(
      connection,
      {
        body: productSearchBody0,
      },
    );
  typia.assert(productPage0);
  TestValidator.predicate(
    "pagination current page is 1",
    productPage0.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    productPage0.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    productPage0.pagination.pages > 0,
  );
  TestValidator.predicate(
    "found data array length is less than or equal to limit",
    Array.isArray(productPage0.data) && productPage0.data.length <= 10,
  );

  // If exists products, validate each product summary
  if (productPage0.data.length > 0) {
    productPage0.data.forEach((product, idx) => {
      typia.assert(product);
      TestValidator.predicate(
        `product[${idx}] has id string with uuid format`,
        typeof product.id === "string" && /[0-9a-fA-F\-]{36}/.test(product.id),
      );
      TestValidator.predicate(
        `product[${idx}] code is non-empty string`,
        typeof product.code === "string" && product.code.length > 0,
      );
      TestValidator.predicate(
        `product[${idx}] name is non-empty string`,
        typeof product.name === "string" && product.name.length > 0,
      );
      TestValidator.predicate(
        `product[${idx}] is_active is boolean`,
        typeof product.is_active === "boolean",
      );
    });
  }
}
