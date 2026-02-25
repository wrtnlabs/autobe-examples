import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_content_moderation_logs_admin_performance_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for accessing moderation logs
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superAdminPassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Generate a specific admin ID to filter by
  const targetAdminId = typia.random<string & tags.Format<"uuid">>();
  // Test filtering by specific admin_id
  const filteredLogs =
    await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
      superAdminConnection,
      {
        body: {
          admin_id: targetAdminId,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(filteredLogs);
  // Validate that all returned logs belong to the specified admin
  if (filteredLogs.data.length > 0) {
    for (const log of filteredLogs.data) {
      TestValidator.equals(
        "admin id matches filter",
        log.admin.id,
        targetAdminId,
      );
    }
  }
  // Test combined filtering with date range
  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const timeFilteredLogs =
    await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
      superAdminConnection,
      {
        body: {
          admin_id: targetAdminId,
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: today.toISOString(),
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(timeFilteredLogs);
  // Validate audit trail integrity for time-filtered results
  if (timeFilteredLogs.data.length > 0) {
    for (const log of timeFilteredLogs.data) {
      TestValidator.equals(
        "time-filtered admin id matches",
        log.admin.id,
        targetAdminId,
      );
      const logDate = new Date(log.created_at);
      TestValidator.predicate(
        "log date within range",
        logDate >= oneWeekAgo && logDate <= today,
      );
    }
  }
  // Test empty result case with non-existent admin ID
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults =
    await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
      superAdminConnection,
      {
        body: {
          admin_id: nonExistentAdminId,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "no results for non-existent admin",
    emptyResults.data.length,
    0,
  );
}
