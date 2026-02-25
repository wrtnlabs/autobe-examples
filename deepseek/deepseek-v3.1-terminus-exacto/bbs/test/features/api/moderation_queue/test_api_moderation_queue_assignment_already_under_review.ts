import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_queue_assignment_already_under_review(
  n: number, 
  connection: api.IConnection
): Promise<void> {
  n;

  // Create calling administrator
  const callingAdminConnection: api.IConnection = { host: connection.host };
  const callingAdmin = await authorize_admin_join(callingAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(callingAdmin);

  // Create first assignee administrator
  const firstAssigneeConnection: api.IConnection = { host: connection.host };
  const firstAssignee = await authorize_admin_join(firstAssigneeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstAssignee);

  // Create second assignee administrator
  const secondAssigneeConnection: api.IConnection = { host: connection.host };
  const secondAssignee = await authorize_admin_join(secondAssigneeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondAssignee);

  // Create user reporter
  const userConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(reporter);

  // Create content flag to generate moderation queue using utility function
  const contentFlag = await generate_random_discussion_board_user_content_flags_create(userConnection, {
    body: {
      flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(contentFlag);

  // First assignment to first administrator
  const firstAssignment = await api.functional.discussionBoard.admin.moderation_queues.assign(callingAdminConnection, {
    queueId: contentFlag.id,
    body: {
      assigned_admin_id: firstAssignee.id,
    } satisfies IDiscussionBoardContentModerationQueueAssignment.IAdministratorAssignment,
  });
  typia.assert(firstAssignment);

  // Verify first assignment
  TestValidator.equals("status becomes under_review after first assignment", firstAssignment.moderationStatus, "under_review");
  TestValidator.equals("first admin assigned", firstAssignment.assignedAdmin?.id, firstAssignee.id);
  TestValidator.predicate("assigned_at set", firstAssignment.assignedAt !== null);

  // Attempt reassignment to second administrator (queue already under review)
  const secondAssignment = await api.functional.discussionBoard.admin.moderation_queues.assign(callingAdminConnection, {
    queueId: contentFlag.id,
    body: {
      assigned_admin_id: secondAssignee.id,
    } satisfies IDiscussionBoardContentModerationQueueAssignment.IAdministratorAssignment,
  });
  typia.assert(secondAssignment);

  // Verify reassignment allowed
  TestValidator.equals("status remains under_review after reassignment", secondAssignment.moderationStatus, "under_review");
  TestValidator.equals("assigned admin updated to second admin", secondAssignment.assignedAdmin?.id, secondAssignee.id);
  TestValidator.predicate("assigned_at timestamp updated", secondAssignment.assignedAt !== null);
  TestValidator.predicate("assignment history count increments", secondAssignment.assignmentHistoryCount > firstAssignment.assignmentHistoryCount);
}