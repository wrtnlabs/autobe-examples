import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

export async function test_api_admin_audit_log_filter_combinations(
  connection: api.IConnection,
) {
  // Step 1: Create new admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Prepare filter combinations for audit log retrieval
  const searchTerms = [
    "login",
    "logout",
    "password_change",
    "admin_action",
    "system_flag_change",
  ];
  const statuses = ["success", "failed", "denied"];
  const sources = ["web", "mobile", "api", "admin_dashboard"];
  const eventTypes = [
    "login",
    "logout",
    "password_change",
    "seller_approval",
    "product_update",
    "data_deletion",
    "system_flag_change",
    "permission_update",
    "admin_action",
  ];

  // Step 3: Create test data - generate random but valid audit log request combinations
  // We'll test multiple combinations of filters
  const filterCombinations = ArrayUtil.repeat(
    5,
    () =>
      ({
        search: RandomGenerator.substring(RandomGenerator.content()),
        event_type: RandomGenerator.pick(eventTypes),
        status: RandomGenerator.pick(statuses),
        source: RandomGenerator.pick(sources),
        start_date: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: new Date().toISOString(),
        page: typia.random<number & tags.Minimum<1> & tags.Maximum<10>>(),
        limit: typia.random<number & tags.Minimum<1> & tags.Maximum<100>>(),
      }) satisfies IShoppingMallAuditLog.IRequest,
  );

  // Step 4: Execute each filter combination and validate responses
  for (const filterOptions of filterCombinations) {
    const response: IPageIShoppingMallAuditLog =
      await api.functional.shoppingMall.admin.audit.logs.index(connection, {
        body: filterOptions,
      });
    typia.assert(response);

    // Validate pagination structure
    TestValidator.equals(
      "pagination structure is correct",
      response.pagination.current,
      filterOptions.page || 1,
    );
    TestValidator.equals(
      "pagination limit is correct",
      response.pagination.limit,
      filterOptions.limit || 20,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      response.pagination.pages >= 0,
    );

    // Validate data array
    TestValidator.predicate(
      "data array is array type",
      Array.isArray(response.data),
    );
    TestValidator.predicate(
      "data items are strings",
      response.data.every((item) => typeof item === "string"),
    );

    // If search term provided, verify it appears in returned logs (case-insensitive)
    if (filterOptions.search) {
      const hasSearchMatch = response.data.some((log) =>
        log.toLowerCase().includes(filterOptions.search!.toLowerCase()),
      );
      TestValidator.predicate(
        "search term appears in at least one log",
        hasSearchMatch,
      );
    }

    // If event type provided, verify all returned logs have that event type
    if (filterOptions.event_type) {
      const hasEventTypeMatch = response.data.every((log) =>
        log.toLowerCase().includes(filterOptions.event_type!.toLowerCase()),
      );
      TestValidator.predicate("all logs contain event type", hasEventTypeMatch);
    }

    // If status provided, verify all returned logs have that status
    if (filterOptions.status) {
      const hasStatusMatch = response.data.every((log) =>
        log.toLowerCase().includes(filterOptions.status!.toLowerCase()),
      );
      TestValidator.predicate("all logs contain status", hasStatusMatch);
    }

    // If source provided, verify all returned logs have that source
    if (filterOptions.source) {
      const hasSourceMatch = response.data.every((log) =>
        log.toLowerCase().includes(filterOptions.source!.toLowerCase()),
      );
      TestValidator.predicate("all logs contain source", hasSourceMatch);
    }

    // Validate date range (if both start and end date provided)
    if (filterOptions.start_date && filterOptions.end_date) {
      const startDate = new Date(filterOptions.start_date);
      const endDate = new Date(filterOptions.end_date);

      // Since audit logs are strings, we need to parse to check date range
      const validDateRange = response.data.every((log) => {
        // This is a simplified check - in reality, audit logs would have structured JSON
        // but the DTO says they're strings, so we're just checking for date string patterns
        const match = log.match(
          /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/,
        );
        if (!match) return true; // No date found, can't validate
        const logDate = new Date(match[1]);
        return logDate >= startDate && logDate <= endDate;
      });
      TestValidator.predicate("all logs are within date range", validDateRange);
    }
  }

  // Step 5: Test that unauthenticated users cannot access audit logs
  // Create a new connection without admin authentication
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated user cannot access audit logs",
    async () => {
      await api.functional.shoppingMall.admin.audit.logs.index(unauthConn, {
        body: {
          search: "test",
        } satisfies IShoppingMallAuditLog.IRequest,
      });
    },
  );
}
