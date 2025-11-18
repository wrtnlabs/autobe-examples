import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Validate that an admin can list customer sessions with basic pagination and
 * customer scoping using PATCH
 * /shoppingMall/admin/customers/{customerId}/sessions.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join (initial admin context for later
 *    reuse).
 * 2. Register a customer via POST /auth/customer/join to ensure a concrete
 *    customerId exists.
 * 3. Re-register admin via POST /auth/admin/join so that the connection
 *    Authorization header contains an admin token when calling the admin-only
 *    endpoint.
 * 4. Build an IShoppingMallCustomerSession.IRequest filter body with:
 *
 *    - Page = 1, limit = 20
 *    - All date range and attribute filters (ipAddress, userAgent, channel, status)
 *         explicitly set to null to validate nullable-handling and request
 *         shape.
 * 5. Call PATCH /shoppingMall/admin/customers/{customerId}/sessions for the
 *    created customer.
 * 6. Assert response typing via typia.assert and verify:
 *
 *    - Pagination.current and pagination.limit echo the requested values.
 *    - For every returned session, session.customer.id matches the requested
 *         customerId.
 */
export async function test_api_admin_customer_sessions_filtered_by_ip_and_channel(
  connection: api.IConnection,
) {
  // 1. Initial admin registration (not strictly required later, but exercises admin.join once).
  const firstAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: firstAdminJoinBody,
    });
  typia.assert(firstAdmin);

  // 2. Customer registration (connection Authorization now holds a customer token).
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 3. Re-establish admin authorization for admin-only endpoint.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. Build filter payload with nullable attributes explicitly set to null.
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page,
    limit,
    createdAtFrom: null,
    createdAtTo: null,
    lastSeenFrom: null,
    lastSeenTo: null,
    ipAddress: null,
    userAgent: null,
    channel: null,
    status: null,
  } satisfies IShoppingMallCustomerSession.IRequest;

  // 5. Call admin customer sessions index for the created customer.
  const pageResult: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination.current equals requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    pagination.limit,
    limit,
  );

  // 6. If any sessions are returned, ensure all belong to the requested customer.
  for (const session of pageResult.data) {
    TestValidator.equals(
      "session.customer.id matches requested customerId",
      session.customer.id,
      customer.id,
    );
  }
}
