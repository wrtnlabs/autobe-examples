import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUptimeMonitoring";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering capabilities for specific service monitoring.
 *
 * This scenario validates that administrators can search for monitoring records
 * by service name using partial matching, filter by health status, and apply
 * date range filtering. Also validates that combined filters work correctly
 * and search functionality supports case-insensitive partial matching.
 */
export async function test_api_uptime_monitoring_service_specific_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Test service name search with partial matching
  // First, get all records to find a service name substring
  const allRecords =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(allRecords);
  if (allRecords.data.length > 0) {
    // Use first record's service name for search test
    const sampleRecord = allRecords.data[0];
    const searchTerm = RandomGenerator.substring(sampleRecord.service_name);
    const searchResult =
      await api.functional.multiUserTodo.admin.uptime_monitorings.index(
        adminConnection,
        {
          body: {
            search: searchTerm,
            page: 1,
            limit: 50,
          } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate that search returns some results (could be 0 if no matches)
    TestValidator.predicate(
      "search request should succeed",
      searchResult.pagination.current === 1,
    );
    // Validate all returned records contain search term (case-insensitive)
    for (const record of searchResult.data) {
      TestValidator.predicate(
        `service name should contain search term "${searchTerm}"`,
        record.service_name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
  }
  // 3. Test health status filtering
  const healthyFilter =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          is_healthy: true,
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(healthyFilter);
  // Validate all records are healthy
  for (const record of healthyFilter.data) {
    TestValidator.predicate(
      "filtered records should be healthy",
      record.is_healthy === true,
    );
  }
  const unhealthyFilter =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          is_healthy: false,
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(unhealthyFilter);
  // Validate all records are unhealthy
  for (const record of unhealthyFilter.data) {
    TestValidator.predicate(
      "filtered records should be unhealthy",
      record.is_healthy === false,
    );
  }
  // Test null filter (should return all records)
  const nullFilter =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          is_healthy: null,
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(nullFilter);
  // 4. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          date_from: oneDayAgo.toISOString(),
          date_to: now.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate all records are within date range
  for (const record of dateRangeResult.data) {
    const recordDate = new Date(record.created_at);
    TestValidator.predicate(
      "record should be after date_from",
      recordDate >= oneDayAgo,
    );
    TestValidator.predicate(
      "record should be before date_to",
      recordDate <= now,
    );
  }
  // 5. Test pagination
  const paginationTest =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "page should be 2",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should be 10",
    paginationTest.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records should be <= limit",
    paginationTest.data.length <= 10,
  );
  // 6. Test combined filters
  const combinedFilter =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          is_healthy: true,
          date_from: oneHourAgo.toISOString(),
          date_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate combined filter results
  for (const record of combinedFilter.data) {
    const recordDate = new Date(record.created_at);
    TestValidator.predicate(
      "combined filter: record should be healthy",
      record.is_healthy === true,
    );
    TestValidator.predicate(
      "combined filter: record should be after date_from",
      recordDate >= oneHourAgo,
    );
    TestValidator.predicate(
      "combined filter: record should be before date_to",
      recordDate <= now,
    );
  }
  // 7. Validate case-insensitive search if we have service names
  if (allRecords.data.length > 1) {
    const sampleServiceName = allRecords.data[1].service_name;
    if (sampleServiceName.length >= 3) {
      const lowercaseSearch = sampleServiceName.substring(0, 3).toLowerCase();
      const uppercaseSearch = lowercaseSearch.toUpperCase();
      const lowerResult =
        await api.functional.multiUserTodo.admin.uptime_monitorings.index(
          adminConnection,
          {
            body: {
              search: lowercaseSearch,
              limit: 10,
            } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
          },
        );
      typia.assert(lowerResult);
      const upperResult =
        await api.functional.multiUserTodo.admin.uptime_monitorings.index(
          adminConnection,
          {
            body: {
              search: uppercaseSearch,
              limit: 10,
            } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
          },
        );
      typia.assert(upperResult);
      // Both searches should return the same number of results for case-insensitive search
      TestValidator.equals(
        "case-insensitive search should return same result count",
        lowerResult.data.length,
        upperResult.data.length,
      );
    }
  }
}
