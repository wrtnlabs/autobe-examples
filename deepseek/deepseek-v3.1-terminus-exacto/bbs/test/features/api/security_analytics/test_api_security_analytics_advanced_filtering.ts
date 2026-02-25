import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_security_analytics_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Test 1: Filter by specific event types
  const eventTypes = ["login_failed", "user_banned", "admin_action"];
  for (const eventType of eventTypes) {
    const filterByEventType =
      await api.functional.discussionBoard.admin.system.analytics.security.index(
        adminConnection,
        {
          body: {
            event_type: eventType,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSecurityEvent.IRequest,
        },
      );
    typia.assert(filterByEventType);
    // Validate that filtered results match the event type criteria
    TestValidator.predicate(
      `events filtered by ${eventType} type`,
      filterByEventType.data.every((event) => event.event_type === eventType),
    );
  }
  // Test 2: Filter by severity levels
  const severityLevels = ["low", "medium", "high", "critical"];
  for (const severity of severityLevels) {
    const filterBySeverity =
      await api.functional.discussionBoard.admin.system.analytics.security.index(
        adminConnection,
        {
          body: {
            severity: severity,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSecurityEvent.IRequest,
        },
      );
    typia.assert(filterBySeverity);
    TestValidator.predicate(
      `events filtered by ${severity} severity`,
      filterBySeverity.data.every((event) => event.severity === severity),
    );
  }
  // Test 3: Filter by unresolved events only
  const unresolvedFilter =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          resolved: false,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(unresolvedFilter);
  TestValidator.predicate(
    "only unresolved events returned",
    unresolvedFilter.data.every((event) => event.resolved === false),
  );
  // Test 4: Combined filtering - high severity unresolved events
  const combinedFilter =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          severity: "high",
          resolved: false,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter: high severity and unresolved",
    combinedFilter.data.every(
      (event) => event.severity === "high" && event.resolved === false,
    ),
  );
  // Test 5: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeFilter =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          created_at_start: oneWeekAgo,
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.predicate(
    "events within date range",
    dateRangeFilter.data.every((event) => {
      const eventDate = new Date(event.created_at);
      const startDate = new Date(oneWeekAgo);
      const endDate = new Date(now.toISOString());
      return eventDate >= startDate && eventDate <= endDate;
    }),
  );
  // Test 6: Pagination validation - simplified to test basic functionality
  const page1 =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(page1);
  const page2 =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(page2);
  // Validate no overlap between pages
  const page1Ids = new Set(page1.data.map((event) => event.id));
  const page2Ids = new Set(page2.data.map((event) => event.id));
  TestValidator.predicate(
    "no overlap between pages",
    Array.from(page2Ids).every((id) => !page1Ids.has(id)),
  );
}
