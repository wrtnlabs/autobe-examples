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
 * Validate that platform admins can drill down into a detailed authentication
 * log entry representing a failed customer login attempt.
 *
 * Business goals:
 *
 * - Ensure that failed customer login attempts are recorded in auth logs as
 *   login.failure events with success=false and a meaningful failureReason.
 * - Ensure that the platform admin detail endpoint GET
 *   /shoppingMall/platformAdmin/authLogs/{authLogId} exposes the relevant
 *   fields for security analysis, including actorType, actorEmail, ipAddress,
 *   occurredAt, and failureReason.
 * - Verify that the ID chosen from the paginated search endpoint actually
 *   resolves to a consistent full record via the detail endpoint.
 *
 * Flow covered by this test:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authorized admin session.
 * 2. Optionally log in the platform admin again via POST /auth/platformAdmin/login
 *    (mainly to exercise auth flows; not strictly required but aligns with
 *    dependencies).
 * 3. Register a customer via POST /auth/customer/join, capturing their email.
 * 4. Perform multiple failed login attempts for that customer via POST
 *    /auth/customer/login using correct email but wrong password, wrapped in
 *    TestValidator.error calls so that test expects failure without type
 *    violations.
 * 5. Re-authenticate as platform admin to ensure the connection carries an admin
 *    token (customer flows overwrite Authorization header).
 * 6. As the platform admin, query the auth logs via PATCH
 *    /shoppingMall/platformAdmin/authLogs with filters:
 *
 *    - Actor_type = "customer".
 *    - Event_types = ["login.failure"].
 *    - Success = false.
 *    - Created_from/created_to bounding the time window around the failed attempts.
 * 7. From the response page (IPageIShoppingMallAuthLog.ISummary), pick one
 *    IShoppingMallAuthLog.ISummary whose actorType is "customer" and eventType
 *    is "login.failure" and extract id as authLogId.
 * 8. Call GET /shoppingMall/platformAdmin/authLogs/{authLogId} via
 *    api.functional.shoppingMall.platformAdmin.authLogs.at.
 * 9. Validate that the returned IShoppingMallAuthLog record:
 *
 *    - Has success === false.
 *    - Has eventType equal to the summary’s eventType ("login.failure").
 *    - Has failureReason defined (non-empty string).
 *    - Has actorType === "customer" and actorEmail equal to the customer email used
 *         in failed attempts.
 *    - Has occurredAt and ipAddress populated and consistent with the summary
 *         record.
 */
export async function test_api_platform_admin_auth_log_detail_for_failed_login(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain authorized session
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "AdminPassw0rd!";

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: "203.0.113.10",
    href: "https://admin.test.local/register",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Optionally log in the admin again (exercise login flow)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "203.0.113.10",
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Register a customer account
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassw0rd!",
    name: RandomGenerator.name(),
    ip: "198.51.100.25",
    href: "https://shop.test.local/register",
    referrer: "https://shop.test.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Generate multiple failed login attempts with wrong password
  const beforeFailures: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const failedLoginBodyTemplate = {
    email: customerEmail,
    password: "WrongPassword!",
    ip: "198.51.100.25",
    href: "https://shop.test.local/login",
    referrer: "https://shop.test.local/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const failureAttempts = 2;
  for (let i = 0; i < failureAttempts; ++i) {
    await TestValidator.error(
      "failed customer login should produce auth log entry",
      async () => {
        await api.functional.auth.customer.login(connection, {
          body: failedLoginBodyTemplate,
        });
      },
    );
  }

  const afterFailures: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 5. Re-authenticate as platform admin to ensure admin token on connection
  const adminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // 6. As platform admin, search auth logs for failed customer logins
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
    actor_type: "customer",
    actor_id: null,
    event_types: ["login.failure"],
    success: false,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: beforeFailures,
    created_to: afterFailures,
  } satisfies IShoppingMallAuthLog.IRequest;

  const pageResult: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  TestValidator.predicate(
    "auth log search should return at least one failed customer login",
    pageResult.data.length > 0,
  );

  const targetSummary: IShoppingMallAuthLog.ISummary | undefined =
    pageResult.data.find(
      (log) =>
        log.actorType === "customer" && log.eventType === "login.failure",
    );

  TestValidator.predicate(
    "there should be a login.failure auth log for customer actorType",
    targetSummary !== undefined,
  );

  const nonNullSummary: IShoppingMallAuthLog.ISummary = typia.assert(
    targetSummary!,
  );

  // 7. Retrieve the detailed auth log by ID
  const detail: IShoppingMallAuthLog =
    await api.functional.shoppingMall.platformAdmin.authLogs.at(connection, {
      authLogId: nonNullSummary.id,
    });
  typia.assert(detail);

  // 8. Validate detail fields against expectations and summary
  TestValidator.predicate(
    "detail.success should be false for failed login",
    detail.success === false,
  );

  TestValidator.equals(
    "detail.eventType should match summary eventType",
    detail.eventType,
    nonNullSummary.eventType,
  );

  TestValidator.predicate(
    "detail.failureReason should be non-empty string for failed login",
    typeof detail.failureReason === "string" && detail.failureReason.length > 0,
  );

  TestValidator.predicate(
    "detail.actorType should be 'customer'",
    detail.actorType === "customer",
  );

  if (detail.actorEmail !== undefined) {
    TestValidator.equals(
      "detail.actorEmail should match customer email when available",
      detail.actorEmail,
      customerEmail,
    );
  }

  TestValidator.predicate(
    "detail.occurredAt should be in the time window of failures",
    detail.occurredAt >= beforeFailures && detail.occurredAt <= afterFailures,
  );

  TestValidator.predicate(
    "detail.ipAddress should be a non-empty string when present",
    detail.ipAddress === undefined || detail.ipAddress.length > 0,
  );

  TestValidator.equals(
    "detail.occurredAt should match summary.occurredAt",
    detail.occurredAt,
    nonNullSummary.occurredAt,
  );
}
