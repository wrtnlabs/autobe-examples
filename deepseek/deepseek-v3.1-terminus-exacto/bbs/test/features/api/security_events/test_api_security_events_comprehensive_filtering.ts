import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive filtering capabilities of security events endpoint.
 * A super administrator needs to monitor security incidents by filtering events
 * by type, severity levels, resolution status, and date ranges.
 */
export async function test_api_security_events_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Filter by event type
  const eventTypeFilter =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          event_type: "failed_login",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(eventTypeFilter);
  TestValidator.equals(
    "pagination metadata exists",
    typeof eventTypeFilter.pagination,
    "object",
  );
  // Test 2: Filter by severity level
  const severityFilter =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          severity: "high",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(severityFilter);
  TestValidator.predicate(
    "has pagination properties",
    eventTypeFilter.pagination.current >= 0 &&
      eventTypeFilter.pagination.limit > 0 &&
      eventTypeFilter.pagination.records >= 0 &&
      eventTypeFilter.pagination.pages >= 0,
  );
  // Test 3: Filter by resolution status
  const resolvedFilter =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          resolved: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(resolvedFilter);
  // Test 4: Combined filters
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          event_type: "suspicious_activity",
          severity: "medium",
          resolved: true,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Test 5: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilter =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(dateFilter);
  // Test 6: Search functionality
  const searchFilter =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          search: "login",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(searchFilter);
  // Validate response structure for all tests
  [
    eventTypeFilter,
    severityFilter,
    resolvedFilter,
    combinedFilter,
    dateFilter,
    searchFilter,
  ].forEach((response, index) => {
    TestValidator.predicate(
      `response ${index} has data array`,
      Array.isArray(response.data),
    );
    TestValidator.predicate(
      `response ${index} has pagination`,
      typeof response.pagination === "object" && response.pagination !== null,
    );
    if (response.data.length > 0) {
      const event = response.data[0];
      TestValidator.predicate(
        `event ${index} has required properties`,
        typeof event.id === "string" &&
          typeof event.event_type === "string" &&
          typeof event.severity === "string" &&
          typeof event.resolved === "boolean" &&
          typeof event.created_at === "string" &&
          (event.resolved_at === null || typeof event.resolved_at === "string"),
      );
    }
  });
}
