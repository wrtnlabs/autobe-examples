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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_queues_escalate } from "../../../generate/generate_random_discussion_board_super_admin_queues_escalate";
import { prepare_random_discussion_board_content_moderation_queue_escalation } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_escalation";

export async function test_api_moderation_queue_escalation_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create authenticated super admin connection with token
  const authenticatedSuperAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdminAuth.token.access },
  };
  // Create and authenticate regular administrator
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
  // Generate a random queue ID for the escalation
  const queueId = typia.random<string & tags.Format<"uuid">>();
  // Create escalation with reassignment type to the created regular admin
  const escalation =
    await api.functional.discussionBoard.superAdmin.queues.escalate(
      authenticatedSuperAdminConnection,
      {
        queueId,
        body: {
          escalation_type: "reassignment",
          previous_priority: "low",
          new_priority: "high",
          escalation_reason: RandomGenerator.paragraph({ sentences: 2 }),
          workflow_state_before: "pending",
          workflow_state_after: "in_review",
          assigned_to_admin_id: adminAuth.id,
        } satisfies IDiscussionBoardContentModerationQueueEscalation.ICreate,
      },
    );
  typia.assert(escalation);
}
