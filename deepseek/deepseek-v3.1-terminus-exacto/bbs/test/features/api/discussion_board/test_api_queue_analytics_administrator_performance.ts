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

export async function test_api_queue_analytics_administrator_performance(
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
  // Retrieve queue analytics
  const analytics =
    await api.functional.discussionBoard.superAdmin.queues.analytics(
      superAdminConnection,
    );
  typia.assert(analytics);
  // Validate business logic - efficiency scores should be calculated correctly
  if (analytics.assignment_distribution.administrators.length > 0) {
    const adminStat = analytics.assignment_distribution.administrators[0];
    TestValidator.predicate(
      "efficiency score calculation",
      adminStat.efficiency_score > 0 ||
        adminStat.average_processing_time_seconds === 0,
    );
  }
  // Validate that total assignments equals sum of individual administrator assignments
  const totalFromAdmins =
    analytics.assignment_distribution.administrators.reduce(
      (sum, admin) => sum + admin.assignment_count,
      0,
    );
  TestValidator.equals(
    "total assignments matches sum of individual assignments",
    analytics.assignment_distribution.total_assignments,
    totalFromAdmins,
  );
  // Validate priority levels sum equals total queue items
  const prioritySum = Object.values(analytics.priority_levels).reduce(
    (sum, count) => sum + count,
    0,
  );
  const queueTotal = Object.values(analytics.queue_statistics).reduce(
    (sum, stat) => sum + stat.count,
    0,
  );
  TestValidator.equals(
    "priority levels sum matches total queue items",
    prioritySum,
    queueTotal,
  );
}
