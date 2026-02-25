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

export async function test_api_queue_analytics_superadmin_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Retrieve moderation queue analytics
  const analytics =
    await api.functional.discussionBoard.superAdmin.queues.analytics(
      superAdminConnection,
    );
  typia.assert(analytics);
  // Validate queue statistics structure
  TestValidator.predicate(
    "queue statistics exists",
    analytics.queue_statistics !== undefined,
  );
  TestValidator.predicate(
    "pending stats exist",
    analytics.queue_statistics.pending !== undefined,
  );
  TestValidator.predicate(
    "under_review stats exist",
    analytics.queue_statistics.under_review !== undefined,
  );
  TestValidator.predicate(
    "resolved stats exist",
    analytics.queue_statistics.resolved !== undefined,
  );
  TestValidator.predicate(
    "dismissed stats exist",
    analytics.queue_statistics.dismissed !== undefined,
  );
  // Validate processing times
  TestValidator.predicate(
    "processing times exist",
    analytics.processing_times !== undefined,
  );
  TestValidator.predicate(
    "average seconds non-negative",
    analytics.processing_times.average_seconds >= 0,
  );
  TestValidator.predicate(
    "processing times by status exist",
    analytics.processing_times.by_status !== undefined,
  );
  // Validate assignment distribution
  TestValidator.predicate(
    "assignment distribution exists",
    analytics.assignment_distribution !== undefined,
  );
  TestValidator.predicate(
    "total assignments non-negative",
    analytics.assignment_distribution.total_assignments >= 0,
  );
  // Validate priority levels
  TestValidator.predicate(
    "priority levels exist",
    analytics.priority_levels !== undefined,
  );
  TestValidator.predicate(
    "low priority non-negative",
    analytics.priority_levels.low >= 0,
  );
  TestValidator.predicate(
    "medium priority non-negative",
    analytics.priority_levels.medium >= 0,
  );
  TestValidator.predicate(
    "high priority non-negative",
    analytics.priority_levels.high >= 0,
  );
  TestValidator.predicate(
    "critical priority non-negative",
    analytics.priority_levels.critical >= 0,
  );
  // Validate escalation analysis
  TestValidator.predicate(
    "escalation analysis exists",
    analytics.escalation_analysis !== undefined,
  );
  TestValidator.predicate(
    "total escalations non-negative",
    analytics.escalation_analysis.total_escalations >= 0,
  );
  TestValidator.predicate(
    "average escalation time non-negative",
    analytics.escalation_analysis.average_escalation_time_hours >= 0,
  );
  // Validate timestamp
  TestValidator.predicate(
    "timestamp exists",
    analytics.timestamp !== undefined,
  );
  TestValidator.predicate(
    "timestamp is valid date",
    !isNaN(new Date(analytics.timestamp).getTime()),
  );
}
