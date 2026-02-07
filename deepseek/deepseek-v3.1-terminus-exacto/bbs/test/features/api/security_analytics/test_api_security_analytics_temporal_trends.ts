import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSecurityEventActorBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEventActorBreakdown";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_security_analytics_temporal_trends(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      privilege_level: "super_admin",
    } satisfies DeepPartial<IDiscussionBoardSuperAdmin.IJoin>,
  });
  typia.assert(superAdmin);
  // Test analytics with different time ranges
  const now = new Date();
  // Test last 24 hours
  const last24Hours = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const analytics24h =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      {
        body: {
          start_date: last24Hours,
          end_date: now.toISOString(),
        } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest,
      },
    );
  typia.assert(analytics24h);
  // Test last 7 days
  const last7Days = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const analytics7d =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      {
        body: {
          start_date: last7Days,
          end_date: now.toISOString(),
        } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest,
      },
    );
  typia.assert(analytics7d);
  // Test last 30 days
  const last30Days = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const analytics30d =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      {
        body: {
          start_date: last30Days,
          end_date: now.toISOString(),
        } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest,
      },
    );
  typia.assert(analytics30d);
  // Test with specific event types
  const analyticsWithTypes =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      {
        body: {
          start_date: last7Days,
          end_date: now.toISOString(),
          event_type: ["failed_login", "suspicious_activity"],
          severity: ["medium", "high"],
        } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest,
      },
    );
  typia.assert(analyticsWithTypes);
  // Test with actor types
  const analyticsWithActors =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      {
        body: {
          start_date: last7Days,
          end_date: now.toISOString(),
          actor_types: ["user", "admin"],
          resolved: false,
        } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest,
      },
    );
  typia.assert(analyticsWithActors);
  // Validate analytics structure and temporal patterns
  TestValidator.predicate(
    "analytics has totalEvents",
    analytics24h.totalEvents >= 0,
  );
  TestValidator.predicate(
    "analytics has resolutionRate",
    analytics24h.resolutionRate >= 0 && analytics24h.resolutionRate <= 100,
  );
  TestValidator.predicate(
    "analytics has unresolvedEvents",
    analytics24h.unresolvedEvents >= 0,
  );
  TestValidator.predicate(
    "analytics has eventsByActor",
    analytics24h.eventsByActor.user >= 0 &&
      analytics24h.eventsByActor.admin >= 0 &&
      analytics24h.eventsByActor.super_admin >= 0,
  );
  // Validate temporal consistency
  TestValidator.predicate(
    "30-day period should have equal or more events than 7-day period",
    analytics30d.totalEvents >= analytics7d.totalEvents,
  );
  TestValidator.predicate(
    "7-day period should have equal or more events than 24-hour period",
    analytics7d.totalEvents >= analytics24h.totalEvents,
  );
  // Validate filtered analytics have valid structure
  TestValidator.predicate(
    "filtered analytics has valid totalEvents",
    analyticsWithTypes.totalEvents >= 0,
  );
  TestValidator.predicate(
    "actor-filtered analytics has valid eventsByActor",
    analyticsWithActors.eventsByActor.user >= 0 &&
      analyticsWithActors.eventsByActor.admin >= 0,
  );
}
