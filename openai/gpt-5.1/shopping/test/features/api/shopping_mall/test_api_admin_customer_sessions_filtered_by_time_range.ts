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

export async function test_api_admin_customer_sessions_filtered_by_time_range(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain admin authorization context
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

  // 2. Register a customer to create a customer account (and its initial session)
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

  const customerId = customerAuthorized.id;

  // 3. Re-authenticate as admin to ensure admin context for session search
  const adminRejoinBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRejoinBody,
    });
  typia.assert(adminAuthorizedAgain);

  // 4. Build a created_at time window around "now" that should include
  // the customer's join-created session(s)
  const now = new Date();
  const fiveMinutesMs = 5 * 60 * 1000;
  const fromDate = new Date(now.getTime() - fiveMinutesMs);
  const toDate = new Date(now.getTime() + fiveMinutesMs);
  const createdAtFrom = fromDate.toISOString();
  const createdAtTo = toDate.toISOString();

  // 5. Build IShoppingMallCustomerSession.IRequest payload for created_at filter
  const createdAtRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    createdAtFrom,
    createdAtTo,
    lastSeenFrom: null,
    lastSeenTo: null,
    ipAddress: null,
    userAgent: null,
    channel: null,
    status: null,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const createdAtPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: createdAtRequestBody,
      },
    );
  typia.assert(createdAtPage);

  // 6. Validate pagination basics
  TestValidator.equals(
    "pagination current page equals requested page",
    createdAtPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit >= returned session count",
    createdAtPage.pagination.limit >= createdAtPage.data.length,
  );

  // 7. Validate all sessions belong to the target customer and lie within the created_at window
  for (const session of createdAtPage.data) {
    // customer id must match
    TestValidator.equals(
      "session customer id matches filter customerId",
      session.customer.id,
      customerId,
    );

    // created_at must be between createdAtFrom and createdAtTo (inclusive)
    TestValidator.predicate(
      "session created_at is not before createdAtFrom",
      session.created_at >= createdAtFrom,
    );
    TestValidator.predicate(
      "session created_at is not after createdAtTo",
      session.created_at <= createdAtTo,
    );
  }

  // 8. Build a second request focusing on lastSeenFrom/lastSeenTo. Since
  // ISummary does not expose last_seen, we only assert ownership and
  // general consistency of the response.
  const lastSeenFrom = createdAtFrom;
  const lastSeenTo = createdAtTo;

  const lastSeenRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    createdAtFrom: null,
    createdAtTo: null,
    lastSeenFrom,
    lastSeenTo,
    ipAddress: null,
    userAgent: null,
    channel: null,
    status: null,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const lastSeenPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: lastSeenRequestBody,
      },
    );
  typia.assert(lastSeenPage);

  TestValidator.equals(
    "lastSeen pagination current page equals requested page",
    lastSeenPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "lastSeen pagination limit >= returned session count",
    lastSeenPage.pagination.limit >= lastSeenPage.data.length,
  );

  for (const session of lastSeenPage.data) {
    TestValidator.equals(
      "lastSeen query session customer id matches filter customerId",
      session.customer.id,
      customerId,
    );
  }
}
