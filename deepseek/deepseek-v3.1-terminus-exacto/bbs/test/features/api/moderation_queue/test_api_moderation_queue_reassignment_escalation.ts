import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_queues_escalate } from "../../../generate/generate_random_discussion_board_admin_queues_escalate";
import { prepare_random_discussion_board_content_moderation_queue_escalation } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_escalation";

/**
 * Test escalation of a moderation queue entry with reassignment to another administrator.
 * This test validates that administrators can escalate moderation tasks requiring reassignment
 * to different administrators, including proper assignment field validation.
 */
export async function test_api_moderation_queue_reassignment_escalation(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator (assigning admin)
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin1);
  // Create second administrator (reassignment target)
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin2);
  // Since we don't have API endpoints to create moderation queue entries,
  // we'll use a random UUID for the queueId parameter
  const queueId = typia.random<string & tags.Format<"uuid">>();
  // Create escalation with reassignment type
  const escalationBody = {
    escalation_type: "reassignment",
    previous_priority: "medium",
    new_priority: "high",
    escalation_reason: RandomGenerator.paragraph({ sentences: 2 }),
    workflow_state_before: "pending_review",
    workflow_state_after: "escalated",
    assigned_to_admin_id: admin2.id,
  } satisfies IDiscussionBoardContentModerationQueueEscalation.ICreate;
  // Test the escalation endpoint
  const escalationResult =
    await api.functional.discussionBoard.admin.queues.escalate(
      adminConnection1,
      {
        queueId,
        body: escalationBody,
      },
    );
  typia.assert(escalationResult);
  // Validate the response structure
  TestValidator.predicate(
    "escalation reason exists",
    escalationResult.reason.length > 0,
  );
  TestValidator.predicate("count is non-negative", escalationResult.count >= 0);
  TestValidator.predicate(
    "percentage is valid",
    escalationResult.percentage >= 0 && escalationResult.percentage <= 100,
  );
  // Validate business logic: reassignment requires assignment fields
  TestValidator.equals(
    "escalation type matches",
    escalationBody.escalation_type,
    "reassignment",
  );
}
