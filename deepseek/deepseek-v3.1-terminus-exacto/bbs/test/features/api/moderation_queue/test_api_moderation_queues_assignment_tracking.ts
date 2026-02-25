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

export async function test_api_moderation_queues_assignment_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_admin_join utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "192.168.1.1",
    },
  });
  typia.assert(adminAuth);
  // Test basic moderation queue search with empty filter
  const emptyResult =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Test filtering by moderation status
  const statusFilter: IDiscussionBoardContentModerationQueueAssignment.IRequest =
    {
      moderation_status: "pending",
      page: 1,
      limit: 10,
    };
  const statusResult =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      { body: statusFilter },
    );
  typia.assert(statusResult);
  // Test filtering by priority level
  const priorityFilter: IDiscussionBoardContentModerationQueueAssignment.IRequest =
    {
      priority_level: "medium",
      page: 1,
      limit: 10,
    };
  const priorityResult =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      { body: priorityFilter },
    );
  typia.assert(priorityResult);
  // Test date range filtering
  const dateFilter: IDiscussionBoardContentModerationQueueAssignment.IRequest =
    {
      created_at_gte: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      created_at_lte: new Date().toISOString(),
      page: 1,
      limit: 10,
    };
  const dateResult =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      { body: dateFilter },
    );
  typia.assert(dateResult);
  // Test auto-flagged filtering
  const autoFlaggedFilter: IDiscussionBoardContentModerationQueueAssignment.IRequest =
    {
      auto_flagged: true,
      page: 1,
      limit: 10,
    };
  const autoFlaggedResult =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      { body: autoFlaggedFilter },
    );
  typia.assert(autoFlaggedResult);
  // Validate pagination structure - FIXED: Access the correct pagination properties
  // The pagination structure is nested, so we need to access it correctly
  TestValidator.equals(
    "pagination has current page",
    emptyResult.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    emptyResult.pagination.pagination.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    emptyResult.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    emptyResult.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Validate data structure for retrieved entries
  if (emptyResult.data.length > 0) {
    const entry = emptyResult.data[0];
    TestValidator.predicate(
      "entry has valid UUID",
      () => typeof entry.id === "string" && entry.id.length === 36,
    );
    TestValidator.predicate(
      "entry has moderation status",
      () => typeof entry.moderation_status === "string",
    );
    TestValidator.predicate(
      "entry has priority level",
      () => typeof entry.priority_level === "string",
    );
    TestValidator.predicate(
      "entry has auto_flagged boolean",
      () => typeof entry.auto_flagged === "boolean",
    );
    TestValidator.predicate(
      "entry has assignment history count",
      () => typeof entry.assignment_history_count === "number",
    );
    TestValidator.predicate(
      "entry has timestamps",
      () =>
        typeof entry.created_at === "string" &&
        typeof entry.updated_at === "string",
    );
    // Validate relationship objects (may be null)
    if (entry.assignedAdmin !== null && entry.assignedAdmin !== undefined) {
      const admin = entry.assignedAdmin;
      TestValidator.predicate(
        "assigned admin has valid structure",
        () =>
          typeof admin.id === "string" &&
          typeof admin.email === "string" &&
          typeof admin.display_name === "string" &&
          typeof admin.created_at === "string",
      );
    }
    if (
      entry.escalatedByAdmin !== null &&
      entry.escalatedByAdmin !== undefined
    ) {
      const escalatedAdmin = entry.escalatedByAdmin;
      TestValidator.predicate(
        "escalated by admin has valid structure",
        () =>
          typeof escalatedAdmin.id === "string" &&
          typeof escalatedAdmin.email === "string" &&
          typeof escalatedAdmin.display_name === "string" &&
          typeof escalatedAdmin.created_at === "string",
      );
    }
  }
}
