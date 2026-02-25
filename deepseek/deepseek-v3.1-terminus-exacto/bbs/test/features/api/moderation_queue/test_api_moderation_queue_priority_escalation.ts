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

export async function test_api_moderation_queue_priority_escalation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a mock queue ID for escalation (since we don't have queue creation API)
  // In a real scenario, we would create a queue entry first
  const queueId = typia.random<string & tags.Format<"uuid">>();
  // Test priority escalation from 'low' to 'high'
  const escalationBody = {
    escalation_type: "priority_increase",
    previous_priority: "low",
    new_priority: "high",
    escalation_reason: RandomGenerator.paragraph({ sentences: 3 }),
    workflow_state_before: "pending_review",
    workflow_state_after: "escalated",
    assigned_to_admin_id: null,
    assigned_to_super_admin_id: null,
  } satisfies IDiscussionBoardContentModerationQueueEscalation.ICreate;
  // Perform escalation using utility function
  const escalationResult =
    await generate_random_discussion_board_admin_queues_escalate(
      adminConnection,
      {
        body: escalationBody,
        params: { queueId },
      },
    );
  typia.assert(escalationResult);
  // Validate escalation record
  TestValidator.equals(
    "escalation reason matches input",
    escalationResult.reason,
    escalationBody.escalation_reason,
  );
  TestValidator.predicate(
    "escalation count should be positive",
    escalationResult.count > 0,
  );
  TestValidator.predicate(
    "escalation percentage should be valid",
    escalationResult.percentage >= 0 && escalationResult.percentage <= 100,
  );
  // Test unauthorized access attempt
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized escalation attempt should fail",
    async () => {
      await generate_random_discussion_board_admin_queues_escalate(
        unauthorizedConnection,
        {
          body: escalationBody,
          params: { queueId },
        },
      );
    },
  );
}
