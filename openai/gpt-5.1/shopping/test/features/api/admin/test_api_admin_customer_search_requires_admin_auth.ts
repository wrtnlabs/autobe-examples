import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that the admin customer search endpoint requires admin authentication
 * and rejects unauthenticated and non-admin actors.
 *
 * Business goals:
 *
 * - Ensure PATCH /shoppingMall/admin/customers cannot be used without any
 *   Authorization header.
 * - Ensure actors authenticated as customer, seller, or guestUser cannot call the
 *   admin customer search endpoint successfully.
 * - Ensure an authenticated admin can successfully execute the search and receive
 *   a typed, paginated page of customer summaries.
 *
 * High-level steps:
 *
 * 1. Build a simple search request body using IShoppingMallCustomer.IRequest with
 *    minimal pagination parameters.
 * 2. Attempt the search with an unauthenticated connection and expect an error.
 * 3. Join as a customer and attempt the search; expect an error.
 * 4. Join as a seller and attempt the search; expect an error.
 * 5. Join as a guestUser and attempt the search; expect an error.
 * 6. Join as an admin and perform the search; expect success and validate
 *    pagination metadata and type safety.
 */
export async function test_api_admin_customer_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare a deterministic search request body.
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomer.IRequest;

  // 2. Unauthenticated access: create a copy of connection without headers.
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthenticated access is rejected", async () => {
    await api.functional.shoppingMall.admin.customers.index(unauthenticated, {
      body: requestBody,
    });
  });

  // 3. Customer join and attempt.
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  await TestValidator.error(
    "customer actor cannot access admin customer search",
    async () => {
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: requestBody,
      });
    },
  );

  // 4. Seller join and attempt.
  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  await TestValidator.error(
    "seller actor cannot access admin customer search",
    async () => {
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: requestBody,
      });
    },
  );

  // 5. Guest user join and attempt.
  const guestJoinBody = {} satisfies IShoppingMallGuestUser.IJoin;
  const guestAuthorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinBody,
    });
  typia.assert(guestAuthorized);

  await TestValidator.error(
    "guest user cannot access admin customer search",
    async () => {
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: requestBody,
      });
    },
  );

  // 6. Admin join and successful search.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const page: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // Business sanity checks on pagination metadata.
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit > 0,
  );
}
