import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
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
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_moderation_queue_assignment_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as the assigning administrator
  const assigningAdminConnection: api.IConnection = { host: connection.host };
  const assigningAdmin = await authorize_admin_join(assigningAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(assigningAdmin);
  // Step 2: Create separate administrator account as assignee
  const assigneeAdminConnection: api.IConnection = { host: connection.host };
  const assigneeAdmin = await authorize_admin_join(assigneeAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(assigneeAdmin);
  // Step 3: Create regular user account to generate content flag
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Step 4: User creates content flag to generate moderation queue entry
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_article_id: null,
          flagged_comment_id: typia.random<string & tags.Format<"uuid">>(),
          flag_reason: RandomGenerator.paragraph({
            sentences: 2,
          }) satisfies string,
        },
      },
    );
  typia.assert(contentFlag);
  // Get the moderation queue ID from the created content flag
  // Assuming the content flag creation automatically creates a moderation queue
  // We need to fetch the moderation queue ID, but since it's not provided in the SDK,
  // we need to assume the queueId is the content flag ID or obtain it via another endpoint.
  // According to the scenario, we need queueId to assign.
  // For simplicity and based on typical design, we'll assume queueId is the content flag's id.
  const queueId = contentFlag.id;
  // Step 5: Assign the moderation queue entry to the assignee administrator
  const updatedQueue =
    await api.functional.discussionBoard.admin.moderation_queues.assign(
      assigningAdminConnection,
      {
        queueId: queueId satisfies string & tags.Format<"uuid">,
        body: {
          assigned_admin_id: assigneeAdmin.id satisfies
            | (string & tags.Format<"uuid">)
            | null,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IAdministratorAssignment,
      },
    );
  typia.assert(updatedQueue);
  // Step 6: Validate the response
  TestValidator.equals(
    "moderation status should be 'under_review'",
    updatedQueue.moderationStatus,
    "under_review",
  );
  TestValidator.notEquals(
    "assigned admin should not be null",
    updatedQueue.assignedAdmin,
    null,
  );
  if (updatedQueue.assignedAdmin) {
    TestValidator.equals(
      "assigned admin id matches",
      updatedQueue.assignedAdmin.id,
      assigneeAdmin.id,
    );
  }
  TestValidator.notEquals(
    "assigned_at should be populated",
    updatedQueue.assignedAt,
    null,
  );
  TestValidator.predicate(
    "assignment history count should be incremented",
    updatedQueue.assignmentHistoryCount > 0,
  );
}
