import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
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
import { generate_random_discussion_board_admin_queues_escalate } from "../../../generate/generate_random_discussion_board_admin_queues_escalate";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_content_moderation_queue_escalation } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_escalation";

export async function test_api_moderation_queue_analytics_escalation_patterns(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connections for testing
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminConnection2: api.IConnection = { host: connection.host };
  // Create user connection for content flagging
  const userConnection: api.IConnection = { host: connection.host };
  // Register and login administrators
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Register and login user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create articles for content flagging
  const article1 = await generate_random_discussion_board_admin_articles_create(
    adminConnection1,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_admin_articles_create(
    adminConnection1,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // Create content flags
  const flag1 =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_article_id: article1.id,
          flag_reason: "Test content flag 1",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flag1);
  const flag2 =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_article_id: article2.id,
          flag_reason: "Test content flag 2",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flag2);
  // Test analytics endpoint before escalations
  const initialAnalytics =
    await api.functional.discussionBoard.admin.queues.analytics(
      adminConnection1,
    );
  typia.assert(initialAnalytics);
  // Validate basic analytics structure
  TestValidator.predicate(
    "analytics should have contentFlag property",
    initialAnalytics.contentFlag !== undefined,
  );
  TestValidator.predicate(
    "analytics should have moderationStatus property",
    initialAnalytics.moderationStatus !== undefined,
  );
  TestValidator.predicate(
    "analytics should have priorityLevel property",
    initialAnalytics.priorityLevel !== undefined,
  );
  // Test escalation with valid admin assignment
  const escalation =
    await generate_random_discussion_board_admin_queues_escalate(
      adminConnection1,
      {
        params: { queueId: initialAnalytics.id },
        body: {
          escalation_type: "priority_increase",
          previous_priority: "low",
          new_priority: "medium",
          escalation_reason: "Content requires urgent review",
          workflow_state_before: "pending",
          workflow_state_after: "under_review",
          assigned_to_admin_id: admin2.id,
        } satisfies IDiscussionBoardContentModerationQueueEscalation.ICreate,
      },
    );
  typia.assert(escalation);
  // Get updated analytics after escalation
  const updatedAnalytics =
    await api.functional.discussionBoard.admin.queues.analytics(
      adminConnection1,
    );
  typia.assert(updatedAnalytics);
  // Validate analytics response structure
  TestValidator.equals(
    "analytics ID should match",
    updatedAnalytics.id,
    initialAnalytics.id,
  );
  TestValidator.predicate(
    "content flag should be present",
    updatedAnalytics.contentFlag !== undefined,
  );
  TestValidator.predicate(
    "moderation status should be valid",
    typeof updatedAnalytics.moderationStatus === "string",
  );
  TestValidator.predicate(
    "priority level should be valid",
    typeof updatedAnalytics.priorityLevel === "string",
  );
  TestValidator.predicate(
    "assignment history count should be a number",
    typeof updatedAnalytics.assignmentHistoryCount === "number",
  );
  TestValidator.predicate(
    "auto flagged should be boolean",
    typeof updatedAnalytics.autoFlagged === "boolean",
  );
  TestValidator.predicate(
    "created at timestamp should be valid",
    updatedAnalytics.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp should be valid",
    updatedAnalytics.updatedAt !== undefined,
  );
  // Test escalation reason tracking
  if (
    updatedAnalytics.escalationReason !== null &&
    updatedAnalytics.escalationReason !== undefined
  ) {
    TestValidator.predicate(
      "escalation reason should be a string",
      typeof updatedAnalytics.escalationReason === "string",
    );
  }
  // Test assignment tracking
  if (
    updatedAnalytics.assignedAdmin !== null &&
    updatedAnalytics.assignedAdmin !== undefined
  ) {
    TestValidator.predicate(
      "assigned admin should have valid structure",
      updatedAnalytics.assignedAdmin.id !== undefined,
    );
  }
  // Test escalation admin tracking
  if (
    updatedAnalytics.escalatedByAdmin !== null &&
    updatedAnalytics.escalatedByAdmin !== undefined
  ) {
    TestValidator.predicate(
      "escalated by admin should have valid structure",
      updatedAnalytics.escalatedByAdmin.id !== undefined,
    );
  }
  // Validate timestamp progression
  TestValidator.predicate(
    "updated at should be after or equal to created at",
    new Date(updatedAnalytics.updatedAt) >=
      new Date(updatedAnalytics.createdAt),
  );
  // Test assignment timestamps
  if (
    updatedAnalytics.assignedAt !== null &&
    updatedAnalytics.assignedAt !== undefined
  ) {
    TestValidator.predicate(
      "assigned at should be valid timestamp",
      typeof updatedAnalytics.assignedAt === "string",
    );
  }
  if (
    updatedAnalytics.resolvedAt !== null &&
    updatedAnalytics.resolvedAt !== undefined
  ) {
    TestValidator.predicate(
      "resolved at should be valid timestamp",
      typeof updatedAnalytics.resolvedAt === "string",
    );
  }
}
