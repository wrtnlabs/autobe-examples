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

export async function test_api_moderation_queue_assignment_workflow_update(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create content flag as user
  const contentFlag =
    await api.functional.discussionBoard.user.content_flags.create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Create first admin connection and authenticate
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminAuth1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpass123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create second admin connection and authenticate
  const adminConnection2: api.IConnection = { host: connection.host };
  const adminAuth2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpass456",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create moderation queue assignment using the generation function
  const assignment =
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      adminConnection1,
      {
        body: {
          discussion_board_content_moderation_queue_id: contentFlag.id,
          assigned_admin_id: adminAuth1.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // Update assignment - change assigned admin to second admin
  const updatedAssignment1 =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.assignments.updateAssignment(
      adminConnection1,
      {
        contentFlagId: contentFlag.id,
        queueId: assignment.contentModerationQueue.id,
        body: {
          assigned_admin_id: adminAuth2.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment1);
  // Validate admin reassignment
  TestValidator.equals(
    "assignment admin changed",
    updatedAssignment1.assignedAdmin.id,
    adminAuth2.id,
  );
  // Update assignment - mark as completed
  const updatedAssignment2 =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.assignments.updateAssignment(
      adminConnection1,
      {
        contentFlagId: contentFlag.id,
        queueId: assignment.contentModerationQueue.id,
        body: {
          completed_at: new Date().toISOString(),
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment2);
  // Validate completion timestamp
  TestValidator.predicate(
    "assignment marked as completed",
    updatedAssignment2.completed_at !== null,
  );
  TestValidator.notEquals(
    "completion timestamp set",
    updatedAssignment2.completed_at,
    null,
  );
  // Validate workflow integrity - assignment ID remains consistent
  TestValidator.equals(
    "assignment ID consistent",
    updatedAssignment1.id,
    assignment.id,
  );
  TestValidator.equals(
    "assignment ID remains same",
    updatedAssignment2.id,
    assignment.id,
  );
  // Validate content moderation queue reference
  TestValidator.equals(
    "content flag reference maintained",
    updatedAssignment2.contentModerationQueue.content_flag_id,
    contentFlag.id,
  );
}
