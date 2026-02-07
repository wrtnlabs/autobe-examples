import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_moderation_queues_assignments_create } from "../../../generate/generate_random_discussion_board_admin_moderation_queues_assignments_create";
import { prepare_random_discussion_board_content_moderation_queue_assignment } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_assignment";

/**
 * Test the successful creation of a moderation queue assignment where an administrator is assigned to review a content moderation task.
 * Validate that the assignment is created with correct timestamps (assigned_at set to current time, completed_at null),
 * proper relationship mapping between the moderation queue entry and administrator, and that the response includes
 * complete assignment details with nested content moderation queue and administrator information.
 * Verify that the assignment history count increments appropriately and that duplicate assignments for the same queue entry are prevented.
 */
export async function test_api_moderation_queue_assignment_create_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
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
  // Since we don't have a utility function to create content moderation queue entries,
  // we'll use the generation function which handles the queue entry creation internally
  const assignment =
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      adminConnection,
      {
        body: {
          assigned_admin_id: admin.id,
        } satisfies DeepPartial<IDiscussionBoardContentModerationQueueAssignment.ICreate>,
      },
    );
  typia.assert(assignment);
  // Validate assignment timestamps - use relative comparison instead of absolute
  const assignedTime = new Date(assignment.assigned_at).getTime();
  const currentTime = Date.now();
  TestValidator.predicate(
    "assigned_at should be recent",
    assignedTime <= currentTime && assignedTime >= currentTime - 5000,
  );
  TestValidator.equals(
    "completed_at should be null",
    assignment.completed_at,
    null,
  );
  // Validate relationship mapping
  TestValidator.equals(
    "admin ID matches",
    assignment.assignedAdmin.id,
    admin.id,
  );
  // Validate nested structure
  TestValidator.predicate(
    "content moderation queue has required fields",
    assignment.contentModerationQueue.id !== undefined &&
      assignment.contentModerationQueue.moderation_status !== undefined &&
      assignment.contentModerationQueue.priority_level !== undefined,
  );
  TestValidator.predicate(
    "assigned admin has required fields",
    assignment.assignedAdmin.id !== undefined &&
      assignment.assignedAdmin.email !== undefined &&
      assignment.assignedAdmin.display_name !== undefined,
  );
  // Validate assignment history count increments
  TestValidator.predicate(
    "assignment history count should be at least 1",
    assignment.contentModerationQueue.assignment_history_count >= 1,
  );
  // Test duplicate assignment prevention
  await TestValidator.error("duplicate assignment should fail", async () => {
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      adminConnection,
      {
        body: {
          discussion_board_content_moderation_queue_id:
            assignment.contentModerationQueue.id,
          assigned_admin_id: admin.id,
        } satisfies DeepPartial<IDiscussionBoardContentModerationQueueAssignment.ICreate>,
      },
    );
  });
}
