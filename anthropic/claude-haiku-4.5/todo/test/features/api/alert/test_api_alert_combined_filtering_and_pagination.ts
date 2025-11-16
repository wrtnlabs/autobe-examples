import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAlert";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test alert list retrieval with combined filtering and pagination.
 *
 * This test validates the alert search functionality for administrators by:
 *
 * 1. Creating an admin account for authentication
 * 2. Retrieving alerts with multiple simultaneous filters (severity, status,
 *    alert_type)
 * 3. Testing pagination controls (skip/take) with filtered results
 * 4. Validating that pagination metadata correctly reflects the filtered dataset
 *
 * The test ensures administrators can efficiently search and paginate through
 * large alert datasets using combined filter criteria.
 */
export async function test_api_alert_combined_filtering_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.equals("admin created with email", admin.email, adminEmail);

  // Step 2: Test alert retrieval with combined filters and pagination
  const pageSize = 10;
  const skipValue = 0;

  const filteredAlertsPage: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        alert_type: "security",
        severity: "critical",
        status: "open",
        skip: skipValue,
        take: pageSize,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(filteredAlertsPage);

  // Step 3: Validate pagination structure
  const pagination: IPage.IPagination = filteredAlertsPage.pagination;
  typia.assert(pagination);
  TestValidator.predicate(
    "pagination current page should be calculated correctly",
    pagination.current === Math.floor(skipValue / pageSize),
  );
  TestValidator.predicate(
    "pagination limit should match request take parameter",
    pagination.limit === pageSize,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pageSize),
  );

  // Step 4: Validate alert data in response
  const alerts: ITodoAppAlert.ISummary[] = filteredAlertsPage.data;
  typia.assert(alerts);

  // Verify data count doesn't exceed requested take parameter
  TestValidator.predicate(
    "returned alert count should not exceed take parameter",
    alerts.length <= pageSize,
  );

  // Verify all returned alerts match filter criteria
  for (const alert of alerts) {
    typia.assert(alert);
    TestValidator.equals(
      "alert severity should match filter",
      alert.severity,
      "critical",
    );
    TestValidator.equals(
      "alert status should match filter",
      alert.status,
      "open",
    );
    TestValidator.equals(
      "alert type should match filter",
      alert.alert_type,
      "security",
    );
  }

  // Step 5: Test pagination with different offset when records exist
  if (pagination.records > pageSize) {
    const secondPageAlertsPage: IPageITodoAppAlert.ISummary =
      await api.functional.todoApp.admin.alerts.index(connection, {
        body: {
          alert_type: "security",
          severity: "critical",
          status: "open",
          skip: pageSize,
          take: pageSize,
        } satisfies ITodoAppAlert.IRequest,
      });
    typia.assert(secondPageAlertsPage);

    // Verify second page pagination
    const secondPagination: IPage.IPagination = secondPageAlertsPage.pagination;
    typia.assert(secondPagination);
    TestValidator.predicate(
      "second page current should reflect offset",
      secondPagination.current === 1,
    );
    TestValidator.predicate(
      "second page limit should match request",
      secondPagination.limit === pageSize,
    );
    TestValidator.equals(
      "total records should be consistent across pages",
      secondPagination.records,
      pagination.records,
    );
  }

  // Step 6: Test with different filter combination
  const alternativeFilterPage: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        alert_type: "performance",
        severity: "warning",
        status: "acknowledged",
        skip: 0,
        take: 20,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(alternativeFilterPage);

  // Verify alternative filter results
  const altPagination: IPage.IPagination = alternativeFilterPage.pagination;
  typia.assert(altPagination);
  TestValidator.predicate(
    "alternative filter pagination should be valid",
    altPagination.current === 0,
  );
  TestValidator.predicate(
    "alternative filter pagination limit should match",
    altPagination.limit === 20,
  );

  // Verify all results match alternative filters
  for (const alert of alternativeFilterPage.data) {
    typia.assert(alert);
    TestValidator.equals(
      "alert severity should match alternative filter",
      alert.severity,
      "warning",
    );
    TestValidator.equals(
      "alert status should match alternative filter",
      alert.status,
      "acknowledged",
    );
    TestValidator.equals(
      "alert type should match alternative filter",
      alert.alert_type,
      "performance",
    );
  }

  // Step 7: Test with minimal page size for pagination boundary testing
  const smallPageSize = 2;
  const smallPageAlertsPage: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        alert_type: "security",
        severity: "critical",
        status: "open",
        skip: 0,
        take: smallPageSize,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(smallPageAlertsPage);

  const smallPagePagination: IPage.IPagination = smallPageAlertsPage.pagination;
  typia.assert(smallPagePagination);
  TestValidator.predicate(
    "small page size should be respected",
    smallPageAlertsPage.data.length <= smallPageSize,
  );
  TestValidator.predicate(
    "small page limit should be set correctly",
    smallPagePagination.limit === smallPageSize,
  );
}
