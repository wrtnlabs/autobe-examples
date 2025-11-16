import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate that platform admin can retrieve detailed authentication log for a
 * customer login event and that the detail is consistent with search summary.
 *
 * Steps:
 *
 * 1. Bootstrap a platform admin (join) and log in as that admin so we can call
 *    admin-only auth log APIs.
 * 2. Create a customer (join) and then perform a successful customer login to
 *    generate a login.success auth log.
 * 3. Switch back to platform admin session.
 * 4. Use authLogs.index with filters for customer login.success events to obtain
 *    at least one IShoppingMallAuthLog.ISummary.
 * 5. Call authLogs.at with the summary.id and validate the returned
 *    IShoppingMallAuthLog detail record is consistent and semantically correct
 *    for a successful customer login.
 */
export async function test_api_platform_admin_auth_log_detail_for_customer_login(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminFromJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminFromJoin);

  // 2. Login as platform admin to ensure credentials work and to
  //    establish a clean admin session.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminFromLogin);

  // 3. Create a customer and perform a successful login
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerFromJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerFromJoin);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerFromLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerFromLogin);

  // 4. Switch back to platform admin session (customer.login updated token)
  const adminFromRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminFromRelogin);

  // 5. Search authentication logs for customer login.success events
  const authLogSearchBody = {
    page: 0,
    limit: 10,
    sort_by: null,
    sort_direction: null,
    actor_type: "customer",
    actor_id: null,
    event_types: ["login.success"],
    success: true,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallAuthLog.IRequest;

  const page: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: authLogSearchBody,
    });
  typia.assert(page);

  TestValidator.predicate(
    "auth log search should return at least one record",
    page.pagination.records > 0 && page.data.length > 0,
  );

  // Prefer an entry with actorType === "customer"
  const customerLogSummary = page.data.find(
    (entry) => entry.actorType === "customer",
  );

  TestValidator.predicate(
    "auth log search should include a customer login.success event",
    customerLogSummary !== undefined,
  );

  if (!customerLogSummary) return; // Guard for TypeScript; predicate already ensures this should not happen

  // 6. Retrieve detail by authLogId
  const detail: IShoppingMallAuthLog =
    await api.functional.shoppingMall.platformAdmin.authLogs.at(connection, {
      authLogId: customerLogSummary.id,
    });
  typia.assert(detail);

  // 7. Validate detailed log consistency and semantics
  TestValidator.equals(
    "auth log detail id matches summary",
    detail.id,
    customerLogSummary.id,
  );

  TestValidator.equals(
    "auth log detail eventType matches summary",
    detail.eventType,
    customerLogSummary.eventType,
  );

  TestValidator.equals(
    "auth log detail success should be true for login.success",
    detail.success,
    true,
  );

  if (customerLogSummary.actorType === "customer") {
    TestValidator.equals(
      "auth log detail actorType is customer when summary actorType is customer",
      detail.actorType,
      "customer",
    );
  }

  if (
    customerLogSummary.actorId !== undefined &&
    detail.actorId !== undefined
  ) {
    TestValidator.equals(
      "auth log detail actorId matches summary when both present",
      detail.actorId,
      customerLogSummary.actorId,
    );
  }

  // actorEmail: if present, should match the customer login email
  if (detail.actorEmail !== undefined) {
    TestValidator.equals(
      "auth log detail actorEmail matches customer email when present",
      detail.actorEmail,
      customerEmail,
    );
  }

  // ipAddress and userAgent should be either undefined or non-empty strings
  if (detail.ipAddress !== undefined) {
    TestValidator.predicate(
      "auth log detail ipAddress is non-empty when present",
      detail.ipAddress.length > 0,
    );
  }

  if (detail.userAgent !== undefined) {
    TestValidator.predicate(
      "auth log detail userAgent is non-empty when present",
      detail.userAgent.length > 0,
    );
  }

  // occurredAt should be a parseable date-time string
  const occurredTime = new Date(detail.occurredAt).getTime();
  TestValidator.predicate(
    "auth log detail occurredAt is a valid date-time string",
    Number.isFinite(occurredTime),
  );

  // metadata should be undefined or an object (non-null)
  if (detail.metadata !== undefined) {
    TestValidator.predicate(
      "auth log detail metadata is an object when present",
      typeof detail.metadata === "object" && detail.metadata !== null,
    );
  }
}
