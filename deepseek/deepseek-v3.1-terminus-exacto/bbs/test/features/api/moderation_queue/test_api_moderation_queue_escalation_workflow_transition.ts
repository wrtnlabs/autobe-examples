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

export async function test_api_moderation_queue_escalation_workflow_transition(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
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
  // Generate random queue ID for the escalation
  const queueId = typia.random<string & tags.Format<"uuid">>();
  // Create escalation with workflow_transition type
  const escalation =
    await generate_random_discussion_board_super_admin_queues_escalate(
      superAdminConnection,
      {
        params: { queueId },
        body: {
          escalation_type: "workflow_transition",
          previous_priority: "low",
          new_priority: "high",
          escalation_reason: RandomGenerator.paragraph({ sentences: 3 }),
          workflow_state_before: "pending_review",
          workflow_state_after: "urgent_review",
        } satisfies IDiscussionBoardContentModerationQueueEscalation.ICreate,
      },
    );
  typia.assert(escalation);
  // Validate escalation response contains proper documentation
  TestValidator.predicate(
    "escalation reason should not be empty",
    escalation.reason.length > 0,
  );
  TestValidator.predicate(
    "escalation count should be positive",
    escalation.count > 0,
  );
  TestValidator.predicate(
    "escalation percentage should be valid",
    escalation.percentage >= 0 && escalation.percentage <= 100,
  );
}
