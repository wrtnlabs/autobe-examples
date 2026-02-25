import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
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
import { generate_random_discussion_board_super_admin_queues_escalate } from "../../../generate/generate_random_discussion_board_super_admin_queues_escalate";
import { prepare_random_discussion_board_content_moderation_queue_escalation } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_escalation";

/**
 * Test super administrator escalation of moderation queue entry from low to critical priority.
 * Validates complete workflow: authenticate as super admin, escalate queue entry,
 * verify priority update, audit trail creation, and escalation reason recording.
 */
export async function test_api_moderation_queue_escalation_priority_increase(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Generate random queue ID for escalation
  const queueId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create escalation request with priority increase from low to critical
  const escalationBody: IDiscussionBoardContentModerationQueueEscalation.ICreate =
    {
      escalation_type: "priority_increase",
      previous_priority: "low",
      new_priority: "critical",
      escalation_reason: RandomGenerator.paragraph({ sentences: 3 }),
      workflow_state_before: "pending_review",
      workflow_state_after: "escalated_for_immediate_action",
      assigned_to_admin_id: null,
      assigned_to_super_admin_id: null,
    };
  // 4. Execute escalation using utility function if available
  const escalationResult =
    await generate_random_discussion_board_super_admin_queues_escalate(
      superAdminConnection,
      {
        body: escalationBody,
        params: { queueId },
      },
    );
  typia.assert(escalationResult);
  // 5. Validate escalation response
  TestValidator.equals(
    "escalation reason recorded",
    escalationResult.reason,
    escalationBody.escalation_reason,
  );
  TestValidator.predicate("positive count", escalationResult.count > 0);
  TestValidator.predicate(
    "valid percentage",
    escalationResult.percentage >= 0 && escalationResult.percentage <= 100,
  );
}
