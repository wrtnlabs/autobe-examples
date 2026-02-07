import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { generate_random_discussion_board_admin_moderation_queues_assignments_create } from "../../../generate/generate_random_discussion_board_admin_moderation_queues_assignments_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_content_moderation_queue_assignment } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_assignment";

export async function test_api_content_flag_escalation_priority_increase(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResponse);
  // Create user connection and content flag
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create content flag
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Assign moderation queue
  const assignment =
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      adminConnection,
      {
        body: {
          discussion_board_content_moderation_queue_id: contentFlag.id,
          assigned_admin_id: adminJoinResponse.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // Escalate priority from medium to high
  const escalationUpdate =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.escalations.update(
      adminConnection,
      {
        contentFlagId: contentFlag.id,
        queueId: assignment.contentModerationQueue.id,
        body: {
          escalation_type: "priority_increase",
          previous_priority: "medium",
          new_priority: "high",
          escalation_reason:
            "Content contains severe violations requiring immediate attention",
          workflow_state_before: "under_review",
          workflow_state_after: "escalated",
        } satisfies IDiscussionBoardContentModerationQueueEscalation.IUpdate,
      },
    );
  typia.assert(escalationUpdate);
  // Validate escalation results
  TestValidator.equals(
    "escalation type",
    escalationUpdate.escalationType,
    "priority_increase",
  );
  TestValidator.equals(
    "previous priority",
    escalationUpdate.previousPriority,
    "medium",
  );
  TestValidator.equals("new priority", escalationUpdate.newPriority, "high");
  TestValidator.equals(
    "escalation reason",
    escalationUpdate.escalationReason,
    "Content contains severe violations requiring immediate attention",
  );
  TestValidator.equals(
    "workflow state before",
    escalationUpdate.workflowStateBefore,
    "under_review",
  );
  TestValidator.equals(
    "workflow state after",
    escalationUpdate.workflowStateAfter,
    "escalated",
  );
  TestValidator.predicate(
    "escalation timestamp exists",
    escalationUpdate.escalationTimestamp !== null,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    escalationUpdate.createdAt !== null,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    escalationUpdate.updatedAt !== null,
  );
}
