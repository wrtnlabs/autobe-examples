import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
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
import { generate_random_discussion_board_admin_moderation_queues_assignments_create } from "../../../generate/generate_random_discussion_board_admin_moderation_queues_assignments_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_content_moderation_queue_assignment } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_assignment";

export async function test_api_moderation_queue_assignment_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Create a content flag as the user
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
  // 3. Create first administrator account
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 4. Create second administrator account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 5. Create initial moderation queue assignment with first admin
  const initialAssignment =
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      admin1Connection,
      {
        body: {
          discussion_board_content_moderation_queue_id: contentFlag.id,
          assigned_admin_id: admin1.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // 6. Reassign the assignment to the second administrator using the correct endpoint
  const updatedAssignment =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.assignments.updateAssignment(
      admin1Connection,
      {
        contentFlagId: contentFlag.id,
        queueId: initialAssignment.contentModerationQueue.id,
        body: {
          assigned_admin_id: admin2.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // 7. Validate the reassignment
  TestValidator.equals(
    "assignment should be reassigned to second admin",
    updatedAssignment.assignedAdmin.id,
    admin2.id,
  );
  TestValidator.notEquals(
    "assignment admin should be different from original",
    updatedAssignment.assignedAdmin.id,
    admin1.id,
  );
  TestValidator.equals(
    "assignment ID should remain the same",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "moderation queue should remain the same",
    updatedAssignment.contentModerationQueue.id,
    initialAssignment.contentModerationQueue.id,
  );
  TestValidator.predicate(
    "assignment timestamp should be set",
    updatedAssignment.assigned_at !== null,
  );
  TestValidator.equals(
    "assignment should not be completed",
    updatedAssignment.completed_at,
    null,
  );
}
