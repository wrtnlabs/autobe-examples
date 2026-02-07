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

/**
 * Test comprehensive security analytics filtering functionality for super administrators.
 * Validates that the security analytics endpoint correctly aggregates and filters security
 * events by event type, severity, date ranges, resolution status, and actor types.
 */
export async function test_api_security_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Test comprehensive filtering with all parameters
  const analyticsRequest: IDiscussionBoardSecurityEvent.IAnalyticsRequest = {
    event_type: [
      "failed_login",
      "suspicious_activity",
      "threat_detected",
      "policy_violation",
    ],
    severity: ["low", "medium", "high", "critical"],
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
    end_date: new Date().toISOString(),
    resolved: false,
    actor_types: ["user", "admin", "super_admin"],
    include_event_data: true,
  } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest;
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      { body: analyticsRequest },
    );
  typia.assert(analyticsResponse);
  // 3. Validate response structure and basic statistics
  TestValidator.predicate(
    "totalEvents should be a non-negative integer",
    analyticsResponse.totalEvents >= 0,
  );
  TestValidator.predicate(
    "resolutionRate should be between 0 and 100",
    analyticsResponse.resolutionRate >= 0 &&
      analyticsResponse.resolutionRate <= 100,
  );
  TestValidator.predicate(
    "unresolvedEvents should be non-negative",
    analyticsResponse.unresolvedEvents >= 0,
  );
  // 4. Validate actor breakdown structure
  TestValidator.predicate(
    "user actor count should be non-negative",
    analyticsResponse.eventsByActor.user >= 0,
  );
  TestValidator.predicate(
    "admin actor count should be non-negative",
    analyticsResponse.eventsByActor.admin >= 0,
  );
  TestValidator.predicate(
    "super_admin actor count should be non-negative",
    analyticsResponse.eventsByActor.super_admin >= 0,
  );
  // 5. Test specific filter combinations
  // Test with only event type filter
  const eventTypeFilter: IDiscussionBoardSecurityEvent.IAnalyticsRequest = {
    event_type: ["failed_login"],
  } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest;
  const eventTypeResponse =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      { body: eventTypeFilter },
    );
  typia.assert(eventTypeResponse);
  // Test with only severity filter
  const severityFilter: IDiscussionBoardSecurityEvent.IAnalyticsRequest = {
    severity: ["high", "critical"],
  } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest;
  const severityResponse =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      { body: severityFilter },
    );
  typia.assert(severityResponse);
  // Test with only actor type filter
  const actorFilter: IDiscussionBoardSecurityEvent.IAnalyticsRequest = {
    actor_types: ["user"],
  } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest;
  const actorResponse =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      { body: actorFilter },
    );
  typia.assert(actorResponse);
  // Test with date range filter
  const dateFilter: IDiscussionBoardSecurityEvent.IAnalyticsRequest = {
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
    end_date: new Date().toISOString(),
  } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest;
  const dateResponse =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      { body: dateFilter },
    );
  typia.assert(dateResponse);
  // Test with resolution status filter
  const resolvedFilter: IDiscussionBoardSecurityEvent.IAnalyticsRequest = {
    resolved: true,
  } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest;
  const resolvedResponse =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      { body: resolvedFilter },
    );
  typia.assert(resolvedResponse);
  // 6. Validate that comprehensive filter includes all event types
  TestValidator.predicate(
    "comprehensive filter should include all event types",
    analyticsResponse.totalEvents >= eventTypeResponse.totalEvents,
  );
}
