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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_moderation_queues_assignments_create } from "../../../generate/generate_random_discussion_board_admin_moderation_queues_assignments_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_content_moderation_queue_assignment } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_assignment";

/**
 * Test content moderation escalation update with priority increase and administrator reassignment.
 *
 * This test validates the comprehensive escalation update workflow where a super administrator
 * modifies both priority levels and administrator assignments. The scenario creates prerequisite
 * entities including user-reported content flag, admin moderation assignment, and super admin
 * authentication, then tests the escalation update functionality.
 */
export async function test_api_content_moderation_escalation_update_priority_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create content flag as authenticated user
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
  // 3. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 4. Create moderation queue assignment
  const assignment =
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      adminConnection,
      {
        body: {
          discussion_board_content_moderation_queue_id: contentFlag.id,
          assigned_admin_id: adminAuth.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // 5. Create super admin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 6. Create initial escalation record first (simulate existing escalation)
  // Since we don't have an escalation creation endpoint, we need to test the update
  // functionality with the assumption that an escalation already exists for the queue
  // 7. Update escalation with priority increase and reassignment
  const updateBody = {
    escalation_type: "priority_reassignment",
    previous_priority: "medium",
    new_priority: "high",
    assigned_to_admin_id: adminAuth.id,
    escalation_reason:
      "Content requires urgent attention due to policy violation severity",
    workflow_state_before: "under_review",
    workflow_state_after: "escalated",
  } satisfies IDiscussionBoardContentModerationQueueEscalation.IUpdate;
  const updatedEscalation =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.escalations.update(
      superAdminConnection,
      {
        contentFlagId: contentFlag.id,
        queueId: assignment.contentModerationQueue.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEscalation);
  // 8. Validate escalation update results
  TestValidator.equals(
    "escalation type updated",
    updatedEscalation.escalationType,
    "priority_reassignment",
  );
  TestValidator.equals(
    "previous priority matches",
    updatedEscalation.previousPriority,
    "medium",
  );
  TestValidator.equals(
    "new priority increased",
    updatedEscalation.newPriority,
    "high",
  );
  TestValidator.equals(
    "escalation reason updated",
    updatedEscalation.escalationReason,
    "Content requires urgent attention due to policy violation severity",
  );
  TestValidator.equals(
    "workflow state before matches",
    updatedEscalation.workflowStateBefore,
    "under_review",
  );
  TestValidator.equals(
    "workflow state after updated",
    updatedEscalation.workflowStateAfter,
    "escalated",
  );
  TestValidator.predicate(
    "escalation timestamp exists",
    updatedEscalation.escalationTimestamp.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    updatedEscalation.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    updatedEscalation.updatedAt.length > 0,
  );
  // 9. Validate relational data
  TestValidator.equals(
    "moderation queue matches",
    updatedEscalation.moderationQueue.id,
    assignment.contentModerationQueue.id,
  );
  TestValidator.equals(
    "assigned admin matches",
    updatedEscalation.assignedToAdmin?.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "escalated by super admin matches",
    updatedEscalation.escalatedBySuperAdmin?.id,
    superAdminAuth.id,
  );
}
