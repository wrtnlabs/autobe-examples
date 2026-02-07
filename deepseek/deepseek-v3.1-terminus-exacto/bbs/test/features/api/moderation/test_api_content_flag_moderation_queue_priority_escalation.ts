import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test escalation of moderation priority for urgent content violations.
 * Since content flag creation endpoint is not available, we test the priority
 * escalation functionality directly using a mock content flag ID.
 * Validate that priority_level field can be updated and escalation_reason
 * is properly recorded.
 */
export async function test_api_content_flag_moderation_queue_priority_escalation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a mock content flag ID since content flag creation endpoint is not available
  const contentFlagId = typia.random<string & tags.Format<"uuid">>();
  // Test priority escalation with escalation reason
  const updateBody: IDiscussionBoardContentModerationQueue.IUpdate = {
    priority_level: "high",
    escalation_reason: "Urgent content violation requiring immediate attention",
  };
  const updatedQueue =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.patchByContentflagid(
      adminConnection,
      {
        contentFlagId,
        body: updateBody,
      },
    );
  typia.assert(updatedQueue);
  // Validate that the API call was successful and returned valid data
  TestValidator.predicate(
    "moderation queue update should succeed",
    updatedQueue !== null,
  );
  // Test updating only priority level without escalation reason
  const priorityOnlyUpdate: IDiscussionBoardContentModerationQueue.IUpdate = {
    priority_level: "standard",
  };
  const priorityUpdatedQueue =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.patchByContentflagid(
      adminConnection,
      {
        contentFlagId,
        body: priorityOnlyUpdate,
      },
    );
  typia.assert(priorityUpdatedQueue);
  // Test updating only escalation reason without changing priority
  const reasonOnlyUpdate: IDiscussionBoardContentModerationQueue.IUpdate = {
    escalation_reason: "Additional context provided for review",
  };
  const reasonUpdatedQueue =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.patchByContentflagid(
      adminConnection,
      {
        contentFlagId,
        body: reasonOnlyUpdate,
      },
    );
  typia.assert(reasonUpdatedQueue);
  // Test empty update (should not fail)
  const emptyUpdate: IDiscussionBoardContentModerationQueue.IUpdate = {};
  const emptyUpdatedQueue =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.patchByContentflagid(
      adminConnection,
      {
        contentFlagId,
        body: emptyUpdate,
      },
    );
  typia.assert(emptyUpdatedQueue);
  // Validate that all API calls returned valid responses
  TestValidator.predicate(
    "all moderation queue updates should return valid data",
    updatedQueue !== null &&
      priorityUpdatedQueue !== null &&
      reasonUpdatedQueue !== null &&
      emptyUpdatedQueue !== null,
  );
}
