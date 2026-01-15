import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMonitoringAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMonitoringAlert";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMonitoringAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlert";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_monitoring_alerts_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // ### Test 1: Basic paginated retrieval
  const basicResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(basicResponse);
  TestValidator.equals(
    "pagination page is 1",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    basicResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(basicResponse.data),
  );
  // ### Test 2: Different page size
  const limitResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(limitResponse);
  TestValidator.equals(
    "pagination limit is 25",
    limitResponse.pagination.limit,
    25,
  );
  // ### Test 3: Sorting by severity (ascending)
  const sortSeverityAscResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "severity",
          order: "asc",
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(sortSeverityAscResponse);
  const severityValues: ("critical" | "high" | "medium" | "low")[] =
    sortSeverityAscResponse.data.map((item) => item.severity);
  for (let i = 0; i < severityValues.length - 1; i++) {
    if (severityValues[i] !== severityValues[i + 1]) {
      // Ensure ascending order: low < medium < high < critical
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      TestValidator.predicate(
        "severity ascending order",
        priorityOrder[severityValues[i]] <=
          priorityOrder[severityValues[i + 1]],
      );
    }
  }
  // ### Test 4: Sorting by severity (descending)
  const sortSeverityDescResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "severity",
          order: "desc",
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(sortSeverityDescResponse);
  const severityDescValues: ("critical" | "high" | "medium" | "low")[] =
    sortSeverityDescResponse.data.map((item) => item.severity);
  for (let i = 0; i < severityDescValues.length - 1; i++) {
    if (severityDescValues[i] !== severityDescValues[i + 1]) {
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      TestValidator.predicate(
        "severity descending order",
        priorityOrder[severityDescValues[i]] >=
          priorityOrder[severityDescValues[i + 1]],
      );
    }
  }
  // ### Test 5: Search by message content
  const searchResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "payment",
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search results contain term",
    searchResponse.data.every((item) =>
      item.message.toLowerCase().includes("payment"),
    ),
  );
  // ### Test 6: Filter by severity level
  const severityFilterResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          severity: "critical",
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(severityFilterResponse);
  TestValidator.predicate(
    "all alerts critical",
    severityFilterResponse.data.every((item) => item.severity === "critical"),
  );
  // ### Test 7: Filter by event type
  const eventTypeResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          event_type: "payment_gateway_timeout",
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(eventTypeResponse);
  TestValidator.predicate(
    "all alerts have correct event type",
    eventTypeResponse.data.every(
      (item) => item.event_type === "payment_gateway_timeout",
    ),
  );
  // ### Test 8: Filter by source component
  const sourceComponentResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          source_component: "payment-gateway-connector",
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(sourceComponentResponse);
  TestValidator.predicate(
    "all alerts from correct source",
    sourceComponentResponse.data.every(
      (item) => item.source_component === "payment-gateway-connector",
    ),
  );
  // ### Test 9: Filter by triggered_at_from
  const triggeredFromResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          triggered_at_from: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(triggeredFromResponse);
  TestValidator.predicate(
    "all alerts triggered after cutoff",
    triggeredFromResponse.data.every(
      (item) =>
        new Date(item.triggered_at).getTime() >=
        new Date(Date.now() - 86400000).getTime(),
    ),
  );
  // ### Test 10: Filter by triggered_at_to
  const triggeredToResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          triggered_at_to: new Date().toISOString(),
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(triggeredToResponse);
  TestValidator.predicate(
    "all alerts triggered before now",
    triggeredToResponse.data.every(
      (item) => new Date(item.triggered_at).getTime() <= new Date().getTime(),
    ),
  );
  // ### Test 11: Filter by resolved_at_from
  const resolvedFromResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          resolved_at_from: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(resolvedFromResponse);
  TestValidator.predicate(
    "all resolved alerts after cutoff",
    resolvedFromResponse.data.every(
      (item) =>
        item.resolved_at === null ||
        new Date(item.resolved_at!).getTime() >=
          new Date(Date.now() - 86400000).getTime(),
    ),
  );
  // ### Test 12: Filter by resolved_at_to
  const resolvedToResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          resolved_at_to: new Date().toISOString(),
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(resolvedToResponse);
  TestValidator.predicate(
    "all resolved alerts before now",
    resolvedToResponse.data.every(
      (item) =>
        item.resolved_at === null ||
        new Date(item.resolved_at!).getTime() <= new Date().getTime(),
    ),
  );
  // ### Test 13: Combination of filters
  const combinedFiltersResponse =
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          severity: "critical",
          source_component: "payment-gateway-connector",
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  typia.assert(combinedFiltersResponse);
  TestValidator.predicate(
    "all alerts are critical and from payment gateway",
    combinedFiltersResponse.data.every(
      (item) =>
        item.severity === "critical" &&
        item.source_component === "payment-gateway-connector",
    ),
  );
  // ### Test 14: Invalid page (less than 1)
  await TestValidator.error("invalid page < 1 should fail", async () => {
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  });
  // ### Test 15: Invalid limit (less than 1)
  await TestValidator.error("invalid limit < 1 should fail", async () => {
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 0,
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  });
  // ### Test 16: Invalid limit (greater than 100)
  await TestValidator.error("invalid limit > 100 should fail", async () => {
    await api.functional.shoppingMall.admin.monitoring.alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 101,
        } satisfies IShoppingMallMonitoringAlert.IRequest,
      },
    );
  });
}
