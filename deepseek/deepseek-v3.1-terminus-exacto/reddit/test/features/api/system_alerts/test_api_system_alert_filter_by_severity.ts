import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlert";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemAlert";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_alert_filter_by_severity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Define severity levels to test
  const severityLevels = ["critical", "high", "medium", "low"] as const;
  // Test 1: Filter by critical severity only
  const criticalResponse =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      {
        body: {
          alert_type: null,
          severity: "critical",
          status: null,
          source_component: null,
          search: null,
          created_at_start: null,
          created_at_end: null,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSystemAlert.IRequest,
      },
    );
  typia.assert(criticalResponse);
  // Verify all returned alerts have "critical" severity
  for (const alert of criticalResponse.data) {
    TestValidator.equals(
      "critical severity filter",
      alert.severity,
      "critical",
    );
  }
  // Test 2: Filter by high severity only
  const highResponse =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      {
        body: {
          alert_type: null,
          severity: "high",
          status: null,
          source_component: null,
          search: null,
          created_at_start: null,
          created_at_end: null,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSystemAlert.IRequest,
      },
    );
  typia.assert(highResponse);
  // Verify all returned alerts have "high" severity
  for (const alert of highResponse.data) {
    TestValidator.equals("high severity filter", alert.severity, "high");
  }
  // Test 3: Filter with empty severity parameter (should return all alerts)
  const allSeveritiesResponse =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      {
        body: {
          alert_type: null,
          severity: null,
          status: null,
          source_component: null,
          search: null,
          created_at_start: null,
          created_at_end: null,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSystemAlert.IRequest,
      },
    );
  typia.assert(allSeveritiesResponse);
  // Test 4: Filter by medium severity only
  const mediumResponse =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      {
        body: {
          alert_type: null,
          severity: "medium",
          status: null,
          source_component: null,
          search: null,
          created_at_start: null,
          created_at_end: null,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSystemAlert.IRequest,
      },
    );
  typia.assert(mediumResponse);
  // Verify all returned alerts have "medium" severity
  for (const alert of mediumResponse.data) {
    TestValidator.equals("medium severity filter", alert.severity, "medium");
  }
  // Test 5: Filter by low severity only
  const lowResponse =
    await api.functional.communityPlatform.admin.system_alerts.index(
      adminConnection,
      {
        body: {
          alert_type: null,
          severity: "low",
          status: null,
          source_component: null,
          search: null,
          created_at_start: null,
          created_at_end: null,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSystemAlert.IRequest,
      },
    );
  typia.assert(lowResponse);
  // Verify all returned alerts have "low" severity
  for (const alert of lowResponse.data) {
    TestValidator.equals("low severity filter", alert.severity, "low");
  }
  // Test 6: Business logic validation - verify pagination works correctly
  TestValidator.predicate(
    "pagination current page",
    allSeveritiesResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    allSeveritiesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allSeveritiesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allSeveritiesResponse.pagination.pages >= 0,
  );
}
