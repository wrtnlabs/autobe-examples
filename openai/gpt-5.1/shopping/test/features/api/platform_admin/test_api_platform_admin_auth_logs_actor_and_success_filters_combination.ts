import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_auth_logs_actor_and_success_filters_combination(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin with deterministic email/password so we can log in again.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email,
    name: RandomGenerator.name(),
    password,
    ip: "203.0.113.10",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Successful login to generate a login.success log entry
  const loginSuccessBody = {
    email,
    password,
    ip: "203.0.113.11",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/register-success",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loginSuccess: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginSuccessBody,
    });
  typia.assert(loginSuccess);

  // Record a time window that should include join+successful login and
  // the soon-to-happen failed login. We base it around "now" to include
  // all events we just created.
  const createdFrom: string & tags.Format<"date-time"> = new Date(
    Date.now() - 5 * 60 * 1000,
  ).toISOString();
  const createdTo: string & tags.Format<"date-time"> = new Date(
    Date.now() + 5 * 60 * 1000,
  ).toISOString();

  // 3. Failed login attempt using wrong password to generate login.failure
  const badPassword = `${password}wrong`;
  const loginFailureBody = {
    email,
    password: badPassword,
    ip: "203.0.113.12",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  await TestValidator.error(
    "platform admin login failure with wrong password",
    async () => {
      await api.functional.auth.platformAdmin.login(connection, {
        body: loginFailureBody,
      });
    },
  );

  // At this point, the current connection should still carry a valid
  // Authorization header from the successful login. Use it to query logs
  // as the platform admin.

  // 4. Query auth logs filtered by actor_type=platformAdmin and success=true
  const successFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
    actor_type: "platformAdmin",
    actor_id: joinedAdmin.id,
    event_types: undefined,
    success: true,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAuthLog.IRequest;

  const successPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: successFilterBody,
    });
  typia.assert(successPage);

  // Basic pagination sanity checks
  const paginationSuccess = successPage.pagination;
  TestValidator.predicate(
    "success logs: pagination limit is positive",
    paginationSuccess.limit > 0,
  );
  TestValidator.predicate(
    "success logs: records non-negative",
    paginationSuccess.records >= 0,
  );

  // All events must be platformAdmin and success-like status
  for (const log of successPage.data) {
    TestValidator.equals(
      "success logs: actorType must be platformAdmin",
      log.actorType,
      "platformAdmin",
    );
    TestValidator.predicate(
      "success logs: status must represent success-like outcome",
      log.status === "success" || log.status === "info",
    );
    if (log.eventType === "login.failure") {
      throw new Error(
        `success logs filter must not include login.failure events: ${log.id}`,
      );
    }
  }

  // 5. Query auth logs again with success=false for same actor and time range
  const failureFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
    actor_type: "platformAdmin",
    actor_id: joinedAdmin.id,
    event_types: undefined,
    success: false,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAuthLog.IRequest;

  const failurePage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: failureFilterBody,
    });
  typia.assert(failurePage);

  const paginationFailure = failurePage.pagination;
  TestValidator.predicate(
    "failure logs: pagination limit is positive",
    paginationFailure.limit > 0,
  );
  TestValidator.predicate(
    "failure logs: records non-negative",
    paginationFailure.records >= 0,
  );

  // All events must be platformAdmin and failure-like status
  for (const log of failurePage.data) {
    TestValidator.equals(
      "failure logs: actorType must be platformAdmin",
      log.actorType,
      "platformAdmin",
    );
    TestValidator.predicate(
      "failure logs: status must represent failure-like outcome",
      log.status === "failure" ||
        log.status === "blocked" ||
        log.status === "suspicious",
    );
    if (log.eventType === "login.success") {
      throw new Error(
        `failure logs filter must not include login.success events: ${log.id}`,
      );
    }
  }

  // Ensure at least one failure log exists in the failure-filtered result set.
  TestValidator.predicate(
    "failure logs: at least one record should exist for wrong-password attempt window",
    failurePage.data.length >= 1,
  );
}
