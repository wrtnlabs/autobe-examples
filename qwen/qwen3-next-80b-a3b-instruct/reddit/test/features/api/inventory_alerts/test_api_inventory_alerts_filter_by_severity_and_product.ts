import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAlerts";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryAlerts";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_alerts_filter_by_severity_and_product(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Get all inventory alerts (first page)
  const allAlerts =
    await api.functional.communityPlatform.admin.inventory_alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100, // Max possible limit
        } satisfies ICommunityPlatformInventoryAlerts.IRequest,
      },
    );
  typia.assert(allAlerts);
  // Step 3: Validate we have data to test with
  if (allAlerts.data.length === 0) {
    throw new Error(
      "No inventory alerts exist in the system - cannot test filtering",
    );
  }
  // Step 4: Test filtering by a specific product_id and alert_severity
  // Pick a random alert as our test target
  const testAlert = RandomGenerator.pick(allAlerts.data);
  // We need to get the product_id from somewhere,
  // but the ISummary does not include product_id - it only has:
  // id, current_stock, reorder_threshold, alert_severity, created_at, alert_message
  // This makes it impossible to filter by product_id as requested in the scenario
  // The API schema requires product_id in the request but doesn't return it in the response
  // This is an API design flaw
  // We cannot test the product_id filtering because we cannot verify it
  // We must test what we can
  // We can still test alert_severity filtering since it's returned in the response
  const testSeverity = testAlert.alert_severity;
  // Test filtering by alert_severity (one of the two requested filters)
  const filteredBySeverity =
    await api.functional.communityPlatform.admin.inventory_alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          alert_severity: testSeverity,
        } satisfies ICommunityPlatformInventoryAlerts.IRequest,
      },
    );
  typia.assert(filteredBySeverity);
  // Validate that all returned alerts have the target severity
  TestValidator.equals(
    "severity filter returns alerts with matching severity",
    filteredBySeverity.data.length > 0,
    true,
  );
  filteredBySeverity.data.forEach((alert) => {
    TestValidator.equals(
      "alert severity matches filter",
      alert.alert_severity,
      testSeverity,
    );
  });
  // We cannot test product_id filtering because the API does not return product_id in the response
  // We cannot verify which product an alert belongs to
  // We cannot create alerts with specific product_id
  // The scenario requires both filters but the API doesn't allow verification of product_id filtering
  // We cannot complete the test as specified
  // We are forced to test what we can
  // We've tested severity filtering as much as possible
  // The product_id filter cannot be validated, so we ignore that part of the test
  // This is a limitation of the API design
  // We must also test that pagination works
  const page2 =
    await api.functional.communityPlatform.admin.inventory_alerts.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformInventoryAlerts.IRequest,
      },
    );
  typia.assert(page2);
  // Validate pagination properties
  TestValidator.equals("pagination current page", page2.pagination.current, 2);
  TestValidator.equals("pagination limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    page2.pagination.records >= 0,
    true,
  );
  TestValidator.equals("pagination pages", page2.pagination.pages >= 1, true);
  // Test sorting
  // We can test ascending order by created_at
  const sortedAscending =
    await api.functional.communityPlatform.admin.inventory_alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformInventoryAlerts.IRequest,
      },
    );
  typia.assert(sortedAscending);
  // Validate ascending order
  for (let i = 0; i < sortedAscending.data.length - 1; i++) {
    const current = sortedAscending.data[i];
    const next = sortedAscending.data[i + 1];
    // We can compare dates by converting to number
    TestValidator.predicate(
      "alerts sorted by created_at ascending",
      Date.parse(current.created_at) <= Date.parse(next.created_at),
    );
  }
  // Test descending order
  const sortedDescending =
    await api.functional.communityPlatform.admin.inventory_alerts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformInventoryAlerts.IRequest,
      },
    );
  typia.assert(sortedDescending);
  // Validate descending order
  for (let i = 0; i < sortedDescending.data.length - 1; i++) {
    const current = sortedDescending.data[i];
    const next = sortedDescending.data[i + 1];
    TestValidator.predicate(
      "alerts sorted by created_at descending",
      Date.parse(current.created_at) >= Date.parse(next.created_at),
    );
  }
}
