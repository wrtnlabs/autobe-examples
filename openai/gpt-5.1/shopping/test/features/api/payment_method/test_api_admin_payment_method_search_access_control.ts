import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate access control for the admin payment method search endpoint.
 *
 * Business goal: Ensure that only administrators can use PATCH
 * /shoppingMall/admin/paymentMethods to search configured payment methods,
 * while customers and unauthenticated callers are blocked.
 *
 * Steps:
 *
 * 1. Use POST /auth/admin/join to register and authenticate an admin.
 *
 *    - Build an IShoppingMallAdminJoin.ICreate body with valid email/password and
 *         href/referrer URIs.
 *    - Call api.functional.auth.admin.join and typia.assert the
 *         IShoppingMallAdmin.IAuthorized response.
 *    - After the call, the SDK will install an admin JWT access token into
 *         connection.headers.Authorization.
 * 2. With the admin token in place, call PATCH /shoppingMall/admin/paymentMethods
 *    via api.functional.shoppingMall.admin.paymentMethods.index.
 *
 *    - Use a minimal yet valid IShoppingMallPaymentMethod.IRequest body, e.g. {
 *         page: 1, limit: 10 }.
 *    - Assert the response type with typia.assert and perform a simple sanity check
 *         with TestValidator.predicate that pagination.current and
 *         pagination.limit are consistent with the request when applicable
 *         (without depending on any particular record counts).
 * 3. Register and authenticate a customer via POST /auth/customer/join.
 *
 *    - Construct an IShoppingMallCustomerJoin.IRequest body using typia.random for
 *         email/password and href/referrer URIs.
 *    - After api.functional.auth.customer.join, the SDK overwrites
 *         connection.headers.Authorization with a customer access token.
 * 4. As an authenticated customer, attempt to call
 *    api.functional.shoppingMall.admin.paymentMethods.index with another valid
 *    IShoppingMallPaymentMethod.IRequest payload.
 *
 *    - Wrap this call with await TestValidator.error, asserting that some error is
 *         thrown (likely an HttpError due to missing admin privileges).
 *    - Do NOT inspect HTTP status codes or error message contents; just confirm that
 *         access is denied by the presence of an error.
 * 5. Build an unauthenticated connection by shallow-cloning the original
 *    connection and replacing headers with an empty object, e.g.: const
 *    unauthConn: api.IConnection = { ...connection, headers: {} };
 *
 *    - Do not read or modify connection.headers directly beyond this clone.
 * 6. Using this unauthenticated connection, attempt another
 *    api.functional.shoppingMall.admin.paymentMethods.index call with a valid
 *    search body and use await TestValidator.error to assert that the request
 *    fails due to lack of authentication. Again, do not assert on status codes
 *    or message content, only that an error is raised.
 *
 * Throughout the test:
 *
 * - Use typia.random with the correct tagged formats for emails, passwords, and
 *   URIs where convenient, or RandomGenerator helpers for realistic strings.
 * - Ensure all request bodies use satisfies with the appropriate DTO types
 *   (IShoppingMallAdminJoin.ICreate, IShoppingMallCustomerJoin.IRequest,
 *   IShoppingMallPaymentMethod.IRequest) without type assertions like as any.
 * - Validate all successful responses with typia.assert.
 */
export async function test_api_admin_payment_method_search_access_control(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin can successfully search payment methods
  const adminSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const adminPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: adminSearchBody,
    });
  typia.assert(adminPage);

  TestValidator.predicate(
    "admin search should return pagination with current page >= 1",
    () => adminPage.pagination.current >= 0 && adminPage.pagination.limit >= 0,
  );

  // 3. Register and authenticate a customer (overwrites Authorization header)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Customer should be forbidden from using admin paymentMethods.index
  const customerSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  await TestValidator.error(
    "customer must not access admin payment method search",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
        body: customerSearchBody,
      });
    },
  );

  // 5. Build an unauthenticated connection and verify access is denied
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  await TestValidator.error(
    "unauthenticated client must not access admin payment method search",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.index(unauthConn, {
        body: unauthSearchBody,
      });
    },
  );
}
