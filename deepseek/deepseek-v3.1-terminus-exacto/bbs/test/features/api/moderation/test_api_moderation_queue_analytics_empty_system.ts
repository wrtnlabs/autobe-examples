import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_queue_analytics_empty_system(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Call analytics endpoint
  const analytics =
    await api.functional.discussionBoard.admin.queues.analytics(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate empty system analytics - focus on business logic
  TestValidator.equals(
    "assignment history count should be zero in empty system",
    analytics.assignmentHistoryCount,
    0,
  );
  TestValidator.equals(
    "no admin should be assigned in empty system",
    analytics.assignedAdmin,
    null,
  );
  TestValidator.equals(
    "no escalation should exist in empty system",
    analytics.escalatedByAdmin,
    null,
  );
  TestValidator.equals(
    "no escalation reason should exist in empty system",
    analytics.escalationReason,
    null,
  );
  TestValidator.equals(
    "auto flagged should be false in empty system",
    analytics.autoFlagged,
    false,
  );
  TestValidator.equals(
    "no assigned at timestamp should exist in empty system",
    analytics.assignedAt,
    null,
  );
  TestValidator.equals(
    "no resolved at timestamp should exist in empty system",
    analytics.resolvedAt,
    null,
  );
  // Validate content flag structure reflects empty system
  TestValidator.equals(
    "flagged article should be null in empty system",
    analytics.contentFlag.flaggedArticle,
    null,
  );
  TestValidator.equals(
    "flagged comment should be null in empty system",
    analytics.contentFlag.flaggedComment,
    null,
  );
  TestValidator.equals(
    "reviewing admin should be null in empty system",
    analytics.contentFlag.reviewingAdmin,
    null,
  );
  TestValidator.equals(
    "content flag resolved at should be null in empty system",
    analytics.contentFlag.resolvedAt,
    null,
  );
}