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

export async function test_api_security_analytics_resolution_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Filter for only resolved events
  const resolvedAnalytics =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      {
        body: {
          resolved: true,
        } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest,
      },
    );
  typia.assert(resolvedAnalytics);
  // Test 2: Filter for only unresolved events
  const unresolvedAnalytics =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      {
        body: {
          resolved: false,
        } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest,
      },
    );
  typia.assert(unresolvedAnalytics);
  // Test 3: Mixed resolution status (no filter)
  const mixedAnalytics =
    await api.functional.discussionBoard.superAdmin.security_events.analytics(
      superAdminConnection,
      {
        body: {
          // No resolved filter to get mixed results
        } satisfies IDiscussionBoardSecurityEvent.IAnalyticsRequest,
      },
    );
  typia.assert(mixedAnalytics);
  // Validate resolution metrics
  TestValidator.predicate(
    "resolution rate between 0-100",
    mixedAnalytics.resolutionRate >= 0 && mixedAnalytics.resolutionRate <= 100,
  );
  TestValidator.predicate(
    "unresolved events count non-negative",
    mixedAnalytics.unresolvedEvents >= 0,
  );
  // Validate resolution rate calculation
  if (mixedAnalytics.totalEvents > 0) {
    const expectedResolutionRate =
      ((mixedAnalytics.totalEvents - mixedAnalytics.unresolvedEvents) /
        mixedAnalytics.totalEvents) *
      100;
    TestValidator.equals(
      "resolution rate calculation",
      mixedAnalytics.resolutionRate,
      expectedResolutionRate,
    );
  }
  // Validate actor breakdown
  TestValidator.predicate(
    "user actor count non-negative",
    mixedAnalytics.eventsByActor.user >= 0,
  );
  TestValidator.predicate(
    "admin actor count non-negative",
    mixedAnalytics.eventsByActor.admin >= 0,
  );
  TestValidator.predicate(
    "super admin actor count non-negative",
    mixedAnalytics.eventsByActor.super_admin >= 0,
  );
  // Validate that resolved filter works correctly
  if (resolvedAnalytics.totalEvents > 0) {
    TestValidator.predicate(
      "resolved analytics should have high resolution rate",
      resolvedAnalytics.resolutionRate >= 50,
    );
  }
  if (unresolvedAnalytics.totalEvents > 0) {
    TestValidator.predicate(
      "unresolved analytics should have low resolution rate",
      unresolvedAnalytics.resolutionRate <= 50,
    );
  }
}
