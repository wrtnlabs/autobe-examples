import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlerts";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemAlerts";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_alerts_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Retrieve system alerts with no filters to confirm access and structure
  const response =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // Step 3: Validate pagination structure (IPage.IPagination)
  TestValidator.predicate(
    "pagination current >= 1",
    () => response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1 and <= 100",
    () => response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    () => response.pagination.pages >= 1,
  );
  // Step 4: Validate data array contains only ICommunityPlatformSystemAlerts.ISummary objects
  TestValidator.predicate("data contains only summary objects", () =>
    response.data.every(
      (alert) =>
        typeof alert.id === "string" &&
        ["low", "medium", "high", "critical"].includes(alert.severity) &&
        [
          "system_health",
          "security_event",
          "resource_exhaustion",
          "data_integrity",
          "external_integration",
          "user_activity",
          "notification_delivery",
          "maintenance",
        ].includes(alert.type) &&
        typeof alert.message === "string" &&
        typeof alert.affected_entity_type === "string" &&
        typeof alert.created_at === "string",
    ),
  );
  // Step 5: Validate search works with simple filtering (severity)
  const severityResponse =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      {
        body: {
          severity: typia.assert<"critical" | "high" | "medium" | "low">("high"),
        },
      },
    );
  typia.assert(severityResponse);
  // Step 6: Validate search works with date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      {
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
        },
      },
    );
  typia.assert(dateRangeResponse);
  // Step 7: Validate pagination with limit
  const limitedResponse =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(limitedResponse);
  TestValidator.equals(
    "pagination limit matches request",
    limitedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination page matches request",
    limitedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limited data count <= 10",
    () => limitedResponse.data.length <= 10,
  );
  // Step 8: Verify response structure matches IPageICommunityPlatformSystemAlerts.ISummary
  // No additional manual validation needed beyond typia.assert() and above predicates
}