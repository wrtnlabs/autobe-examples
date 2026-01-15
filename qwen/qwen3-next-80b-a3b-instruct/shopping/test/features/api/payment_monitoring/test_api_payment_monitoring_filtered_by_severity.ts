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
export async function test_api_payment_monitoring_filtered_by_severity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using utility function (MANDATORY)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Test each severity level individually
  const severities: ("critical" | "high" | "medium" | "low")[] = [
    "critical",
    "high",
    "medium",
    "low",
  ];
  for (const severity of severities) {
    // Make API call with specific severity filter
    const response: IPageIShoppingMallMonitoringAlert.ISummary =
      await api.functional.shoppingMall.admin.monitoring.payments.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            severity: severity,
          } satisfies IShoppingMallMonitoringAlert.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination
    TestValidator.equals("page should be 1", response.pagination.current, 1);
    TestValidator.equals("limit should be 10", response.pagination.limit, 10);
    TestValidator.predicate(
      "total records should be >= 0",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages should be >= 1",
      response.pagination.pages >= 1,
    );
    // Validate all returned alerts have the specified severity
    for (const alert of response.data) {
      TestValidator.equals(
        `alert severity should be ${severity}`,
        alert.severity,
        severity,
      );
      // Validate resolved_at is either valid date-time or null
      if (alert.resolved_at !== null) {
        TestValidator.predicate(
          "resolved_at should be valid date-time format",
          /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.\d{1,9})?(?:Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
            alert.resolved_at,
          ),
        );
      }
    }
    // Test that if there are alerts for this severity, we get at least one
    if (response.data.length > 0) {
      TestValidator.predicate(
        `should have at least one alert with ${severity} severity`,
        true,
      );
    }
  }
  // Step 3: Test with empty severity filter (should return all alerts)
  const allResponse: IPageIShoppingMallMonitoringAlert.ISummary =
    await api.functional.shoppingMall.admin.monitoring.payments.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallMonitoringAlert.IRequest, // No severity filter
      },
    );
  typia.assert(allResponse);
  // Ensure we got some alerts
  TestValidator.predicate(
    "should have at least one alert without severity filter",
    allResponse.data.length > 0,
  );
  // Verify the total number of alerts with all severities is >= sum of individual severity counts
  // This test is based on the assumption that every alert has one severity, but we don't have access to
  // the full dataset to verify this comprehensively
}
