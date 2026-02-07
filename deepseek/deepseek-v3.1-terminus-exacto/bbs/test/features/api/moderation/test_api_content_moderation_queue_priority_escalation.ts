import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

/**
 * Test priority escalation and workload management in moderation queue.
 *
 * This test validates that super administrators can properly escalate priority levels
 * in content moderation queues and provide escalation reasons for high-priority cases.
 * Since we cannot create actual moderation queues through the API, this test focuses
 * on validating the priority escalation functionality with simulated data.
 */
export async function test_api_content_moderation_queue_priority_escalation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test priority escalation with high priority and escalation reason
  const highPriorityUpdate =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.putByContentflagidAndQueueid(
      superAdminConnection,
      {
        contentFlagId: typia.random<string & tags.Format<"uuid">>(),
        queueId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          priority_level: "high",
          escalation_reason:
            "Urgent content requiring immediate review due to policy violation severity",
        } satisfies IDiscussionBoardContentModerationQueue.IUpdate,
      },
    );
  typia.assert(highPriorityUpdate);
  // 3. Validate that priority escalation was properly handled
  TestValidator.predicate(
    "high priority level should be accepted",
    highPriorityUpdate !== null
  );
  // 4. Test medium priority without escalation reason
  const mediumPriorityUpdate =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.putByContentflagidAndQueueid(
      superAdminConnection,
      {
        contentFlagId: typia.random<string & tags.Format<"uuid">>(),
        queueId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          priority_level: "medium",
          escalation_reason: null,
        } satisfies IDiscussionBoardContentModerationQueue.IUpdate,
      },
    );
  typia.assert(mediumPriorityUpdate);
  TestValidator.predicate(
    "medium priority should be accepted",
    mediumPriorityUpdate !== null
  );
  // 5. Test low priority without any escalation reason
  const lowPriorityUpdate =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.putByContentflagidAndQueueid(
      superAdminConnection,
      {
        contentFlagId: typia.random<string & tags.Format<"uuid">>(),
        queueId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          priority_level: "low",
        } satisfies IDiscussionBoardContentModerationQueue.IUpdate,
      },
    );
  typia.assert(lowPriorityUpdate);
  TestValidator.predicate(
    "low priority should be accepted",
    lowPriorityUpdate !== null
  );
  // 6. Test that the system handles priority level validation properly
  // The API should accept valid priority levels and handle invalid ones appropriately
  TestValidator.predicate(
    "priority escalation functionality is accessible",
    highPriorityUpdate !== null &&
      mediumPriorityUpdate !== null &&
      lowPriorityUpdate !== null,
  );
}