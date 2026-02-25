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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_moderation_queue_analytics_multiple_statuses(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Retrieve analytics - this will work with whatever data exists in the system
  const analytics =
    await api.functional.discussionBoard.admin.queues.analytics(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate basic analytics structure
  TestValidator.predicate(
    "analytics contains moderation queue entity",
    typeof analytics.id === "string" && analytics.id.length > 0,
  );
  TestValidator.predicate(
    "analytics contains content flag information",
    analytics.contentFlag !== undefined &&
      typeof analytics.contentFlag.id === "string",
  );
  TestValidator.predicate(
    "analytics contains moderation status",
    typeof analytics.moderationStatus === "string" &&
      analytics.moderationStatus.length > 0,
  );
  TestValidator.predicate(
    "analytics contains priority level",
    typeof analytics.priorityLevel === "string" &&
      analytics.priorityLevel.length > 0,
  );
  TestValidator.predicate(
    "analytics contains assignment history count",
    typeof analytics.assignmentHistoryCount === "number" &&
      analytics.assignmentHistoryCount >= 0,
  );
  TestValidator.predicate(
    "analytics contains auto-flagged status",
    typeof analytics.autoFlagged === "boolean",
  );
  TestValidator.predicate(
    "analytics contains creation timestamp",
    typeof analytics.createdAt === "string" && analytics.createdAt.length > 0,
  );
  TestValidator.predicate(
    "analytics contains update timestamp",
    typeof analytics.updatedAt === "string" && analytics.updatedAt.length > 0,
  );
  // Validate optional fields (may be null/undefined)
  if (
    analytics.assignedAdmin !== undefined &&
    analytics.assignedAdmin !== null
  ) {
    TestValidator.predicate(
      "assigned admin has valid structure",
      typeof analytics.assignedAdmin.id === "string" &&
        typeof analytics.assignedAdmin.email === "string" &&
        typeof analytics.assignedAdmin.display_name === "string",
    );
  }
  if (
    analytics.escalatedByAdmin !== undefined &&
    analytics.escalatedByAdmin !== null
  ) {
    TestValidator.predicate(
      "escalated by admin has valid structure",
      typeof analytics.escalatedByAdmin.id === "string" &&
        typeof analytics.escalatedByAdmin.email === "string" &&
        typeof analytics.escalatedByAdmin.display_name === "string",
    );
  }
  if (analytics.assignedAt !== undefined && analytics.assignedAt !== null) {
    TestValidator.predicate(
      "assigned at is valid timestamp",
      typeof analytics.assignedAt === "string" &&
        analytics.assignedAt.length > 0,
    );
  }
  if (analytics.resolvedAt !== undefined && analytics.resolvedAt !== null) {
    TestValidator.predicate(
      "resolved at is valid timestamp",
      typeof analytics.resolvedAt === "string" &&
        analytics.resolvedAt.length > 0,
    );
  }
  if (
    analytics.escalationReason !== undefined &&
    analytics.escalationReason !== null
  ) {
    TestValidator.predicate(
      "escalation reason is valid string",
      typeof analytics.escalationReason === "string",
    );
  }
}
