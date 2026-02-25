import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import type { IDiscussionBoardContentModerationQueueStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueStatistic";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_queue_analytics_empty_system(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator and get authorization
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Update connection headers with authorization token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authorized.token.access,
  };
  // Get analytics for empty system
  const analytics =
    await api.functional.discussionBoard.superAdmin.queues.analytics(
      superAdminConnection,
    );
  typia.assert(analytics);
  // Validate queue statistics - all should be zero
  TestValidator.equals(
    "pending count should be zero",
    analytics.queue_statistics.pending.count,
    0,
  );
  TestValidator.equals(
    "pending percentage should be zero",
    analytics.queue_statistics.pending.percentage,
    0,
  );
  TestValidator.equals(
    "under_review count should be zero",
    analytics.queue_statistics.under_review.count,
    0,
  );
  TestValidator.equals(
    "under_review percentage should be zero",
    analytics.queue_statistics.under_review.percentage,
    0,
  );
  TestValidator.equals(
    "resolved count should be zero",
    analytics.queue_statistics.resolved.count,
    0,
  );
  TestValidator.equals(
    "resolved percentage should be zero",
    analytics.queue_statistics.resolved.percentage,
    0,
  );
  TestValidator.equals(
    "dismissed count should be zero",
    analytics.queue_statistics.dismissed.count,
    0,
  );
  TestValidator.equals(
    "dismissed percentage should be zero",
    analytics.queue_statistics.dismissed.percentage,
    0,
  );
  // Validate processing times
  TestValidator.equals(
    "average processing seconds should be zero",
    analytics.processing_times.average_seconds,
    0,
  );
  TestValidator.equals(
    "pending processing time should be zero",
    analytics.processing_times.by_status.pending,
    0,
  );
  TestValidator.equals(
    "under_review processing time should be zero",
    analytics.processing_times.by_status.under_review,
    0,
  );
  TestValidator.equals(
    "resolved processing time should be zero",
    analytics.processing_times.by_status.resolved,
    0,
  );
  TestValidator.equals(
    "dismissed processing time should be zero",
    analytics.processing_times.by_status.dismissed,
    0,
  );
  // Validate assignment distribution
  TestValidator.equals(
    "administrators array should be empty",
    analytics.assignment_distribution.administrators.length,
    0,
  );
  TestValidator.equals(
    "total assignments should be zero",
    analytics.assignment_distribution.total_assignments,
    0,
  );
  // Validate priority levels
  TestValidator.equals(
    "low priority count should be zero",
    analytics.priority_levels.low,
    0,
  );
  TestValidator.equals(
    "medium priority count should be zero",
    analytics.priority_levels.medium,
    0,
  );
  TestValidator.equals(
    "high priority count should be zero",
    analytics.priority_levels.high,
    0,
  );
  TestValidator.equals(
    "critical priority count should be zero",
    analytics.priority_levels.critical,
    0,
  );
  // Validate escalation analysis
  TestValidator.equals(
    "total escalations should be zero",
    analytics.escalation_analysis.total_escalations,
    0,
  );
  TestValidator.equals(
    "escalation reasons array should be empty",
    analytics.escalation_analysis.by_reason.length,
    0,
  );
  TestValidator.equals(
    "average escalation time should be zero",
    analytics.escalation_analysis.average_escalation_time_hours,
    0,
  );
  // Validate timestamp format
  TestValidator.predicate("timestamp should be valid ISO string", () => {
    const date = new Date(analytics.timestamp);
    return !isNaN(date.getTime());
  });
}
