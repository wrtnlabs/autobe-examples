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

export async function test_api_platform_admin_customer_auth_history_filter_by_event_and_success(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Choose a random customerId (no customer-creation API is available here)
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Common filter parameters
  const eventTypes: IShoppingMallAuthLog.ISummary["eventType"][] = [
    "login.success",
    "login.failure",
  ];

  // Helper to build base request body
  const baseRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
    actor_type: "customer",
    actor_id: customerId,
    event_types: eventTypes,
  } satisfies IShoppingMallAuthLog.IRequest;

  // 3a. success = true (only successful login events)
  const requestSuccessTrue: IShoppingMallAuthLog.IRequest = {
    ...baseRequest,
    success: true,
  };

  const pageSuccessTrue: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.authHistory.index(
      connection,
      {
        customerId,
        body: requestSuccessTrue,
      },
    );
  typia.assert(pageSuccessTrue);

  // Validate that all events match filters: eventType in set and status === "success"
  for (const log of pageSuccessTrue.data) {
    TestValidator.predicate(
      "success=true result has expected eventType",
      eventTypes.includes(log.eventType),
    );
    TestValidator.equals(
      "success=true result has status 'success'",
      log.status,
      "success",
    );
  }

  // 3b. success = false (only failed login events)
  const requestSuccessFalse: IShoppingMallAuthLog.IRequest = {
    ...baseRequest,
    success: false,
  };

  const pageSuccessFalse: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.authHistory.index(
      connection,
      {
        customerId,
        body: requestSuccessFalse,
      },
    );
  typia.assert(pageSuccessFalse);

  for (const log of pageSuccessFalse.data) {
    TestValidator.predicate(
      "success=false result has expected eventType",
      eventTypes.includes(log.eventType),
    );
    TestValidator.equals(
      "success=false result has status 'failure'",
      log.status,
      "failure",
    );
  }

  // 3c. success not specified (both successful and failed events)
  const requestAll: IShoppingMallAuthLog.IRequest = {
    ...baseRequest,
    success: undefined,
  };

  const pageAll: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.authHistory.index(
      connection,
      {
        customerId,
        body: requestAll,
      },
    );
  typia.assert(pageAll);

  for (const log of pageAll.data) {
    TestValidator.predicate(
      "all-results have expected eventType",
      eventTypes.includes(log.eventType),
    );
    TestValidator.predicate(
      "all-results have status success or failure",
      log.status === "success" || log.status === "failure",
    );
  }

  // 4. Cross-check counts: success=true + success=false should not exceed total for same filter without success
  TestValidator.predicate(
    "combined success=true/false count does not exceed all-results count",
    pageSuccessTrue.data.length + pageSuccessFalse.data.length <=
      pageAll.data.length,
  );
}
