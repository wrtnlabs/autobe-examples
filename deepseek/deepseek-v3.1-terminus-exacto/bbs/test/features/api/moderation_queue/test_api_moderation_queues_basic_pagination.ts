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

export async function test_api_moderation_queues_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Search moderation queues with default pagination (no filters)
  const searchResult =
    await api.functional.discussionBoard.admin.moderation_queues.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardContentModerationQueueAssignment.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination metadata exists",
    typeof searchResult.pagination,
    "object",
  );
  // Use alternative pagination property names that exist
  TestValidator.predicate(
    "current page is valid",
    (searchResult.pagination as any).current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    (searchResult.pagination as any).limit >= 0,
  );
  TestValidator.predicate(
    "total records is valid", 
    (searchResult.pagination as any).records >= 0,
  );
  TestValidator.predicate(
    "total pages is valid",
    (searchResult.pagination as any).pages >= 0,
  );
  // Validate each queue entry
  for (const queueEntry of searchResult.data) {
    typia.assert(queueEntry);
    // Required fields validation
    TestValidator.predicate("has id", queueEntry.id.length > 0);
    TestValidator.predicate(
      "has moderation_status",
      queueEntry.moderation_status.length > 0,
    );
    TestValidator.predicate(
      "has priority_level",
      queueEntry.priority_level.length > 0,
    );
    TestValidator.predicate(
      "has auto_flagged",
      typeof queueEntry.auto_flagged === "boolean",
    );
    TestValidator.predicate(
      "has assignment_history_count",
      queueEntry.assignment_history_count >= 0,
    );
    TestValidator.predicate(
      "has created_at",
      typeof queueEntry.created_at === "string",
    );
    TestValidator.predicate(
      "has updated_at",
      typeof queueEntry.updated_at === "string",
    );
    // Content flag validation
    typia.assert(queueEntry.contentFlag);
    TestValidator.predicate(
      "contentFlag has id",
      queueEntry.contentFlag.id.length > 0,
    );
    TestValidator.predicate(
      "contentFlag has flagReason",
      queueEntry.contentFlag.flagReason.length > 0,
    );
    TestValidator.predicate(
      "contentFlag has status",
      queueEntry.contentFlag.status.length > 0,
    );
    TestValidator.predicate(
      "contentFlag has createdAt",
      typeof queueEntry.contentFlag.createdAt === "string",
    );
    // Optional assignedAdmin validation
    if (
      queueEntry.assignedAdmin !== null &&
      queueEntry.assignedAdmin !== undefined
    ) {
      typia.assert(queueEntry.assignedAdmin);
      TestValidator.predicate(
        "assignedAdmin has id",
        queueEntry.assignedAdmin.id.length > 0,
      );
      TestValidator.predicate(
        "assignedAdmin has email",
        queueEntry.assignedAdmin.email.length > 0,
      );
      TestValidator.predicate(
        "assignedAdmin has display_name",
        queueEntry.assignedAdmin.display_name.length > 0,
      );
    }
    // Optional escalatedByAdmin validation
    if (
      queueEntry.escalatedByAdmin !== null &&
      queueEntry.escalatedByAdmin !== undefined
    ) {
      typia.assert(queueEntry.escalatedByAdmin);
      TestValidator.predicate(
        "escalatedByAdmin has id",
        queueEntry.escalatedByAdmin.id.length > 0,
      );
      TestValidator.predicate(
        "escalatedByAdmin has email",
        queueEntry.escalatedByAdmin.email.length > 0,
      );
      TestValidator.predicate(
        "escalatedByAdmin has display_name",
        queueEntry.escalatedByAdmin.display_name.length > 0,
      );
    }
  }
}