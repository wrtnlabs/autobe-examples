import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationQueueAssignment";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_queues_filter_by_status_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Note: In the actual implementation, we would need to create moderation queue entries
  // through actual content creation and flagging workflow.
  // However, based on the provided SDK functions, we can only search existing queues.
  // We assume there is existing data in the system for testing.
  // 2. Test filtering by moderation_status
  const pendingResults =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          moderation_status: "pending",
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(pendingResults);
  for (const item of pendingResults.data) {
    TestValidator.equals(
      "pending status filter",
      item.moderation_status,
      "pending",
    );
  }
  // 3. Test filtering by priority_level
  const highPriorityResults =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          priority_level: "high",
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(highPriorityResults);
  for (const item of highPriorityResults.data) {
    TestValidator.equals("high priority filter", item.priority_level, "high");
  }
  // 4. Test filtering by auto_flagged
  const autoFlaggedResults =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          auto_flagged: true,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(autoFlaggedResults);
  for (const item of autoFlaggedResults.data) {
    TestValidator.equals("auto_flagged true filter", item.auto_flagged, true);
  }
  const userFlaggedResults =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          auto_flagged: false,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(userFlaggedResults);
  for (const item of userFlaggedResults.data) {
    TestValidator.equals("auto_flagged false filter", item.auto_flagged, false);
  }
  // 5. Test combined filters
  const combinedResults =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          moderation_status: "pending",
          priority_level: "high",
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(combinedResults);
  for (const item of combinedResults.data) {
    TestValidator.equals(
      "combined filter status",
      item.moderation_status,
      "pending",
    );
    TestValidator.equals(
      "combined filter priority",
      item.priority_level,
      "high",
    );
  }
  // 6. Test date range filters (current time minus 1 day to now)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilterResults =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          created_at_gte: oneDayAgo.toISOString(),
          created_at_lte: now.toISOString(),
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(dateFilterResults);
  for (const item of dateFilterResults.data) {
    const createdAt = new Date(item.created_at);
    TestValidator.predicate(
      "created_at within range",
      createdAt >= oneDayAgo && createdAt <= now,
    );
  }
  // 7. Test pagination
  const paginatedResults =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResults.data.length <= 10,
  );
}
