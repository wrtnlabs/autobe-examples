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
 * Test the scenario where a moderation queue entry is already assigned to an administrator
 * and attempting to create a duplicate assignment fails. Validate that the system properly
 * detects existing assignments and returns an appropriate error response. This tests the
 * business rule that prevents multiple administrators from being assigned to the same
 * moderation task simultaneously, ensuring workflow integrity and preventing assignment conflicts.
 */
export async function test_api_moderation_queue_assignment_already_assigned(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator connection
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Create second administrator connection
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Create a moderation queue assignment using the first administrator
  // Note: We need to use actual entity IDs that exist in the system
  // Since we don't have a utility function to create moderation queue entries,
  // we'll need to use the SDK function but with proper validation
  const assignmentBody = {
    discussion_board_content_moderation_queue_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    assigned_admin_id: admin1.id,
  } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate;
  // Use the utility function for assignment creation
  const assignment =
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      adminConnection1,
      { body: assignmentBody },
    );
  typia.assert(assignment);
  // Attempt to create a duplicate assignment using the second administrator
  // This should fail since the moderation queue entry is already assigned
  await TestValidator.error("duplicate assignment should fail", async () => {
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      adminConnection2,
      {
        body: {
          discussion_board_content_moderation_queue_id:
            assignmentBody.discussion_board_content_moderation_queue_id,
          assigned_admin_id: admin2.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate,
      },
    );
  });
}
