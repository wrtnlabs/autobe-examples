import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that moderators can assign moderation queue items to themselves and
 * update processing status.
 *
 * This E2E test validates the self-assignment workflow where a moderator
 * creates a queue item and then assigns it to themselves, updating the status
 * from 'pending' to 'assigned'. The test ensures moderators can properly claim
 * queue items for processing and that self-assignment workflows work correctly
 * with proper status transitions and assignment tracking.
 */
export async function test_api_moderation_queue_moderator_self_assignment(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a moderation queue item with initial 'pending' status
  const queueItem: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "reports",
          priority_level: "medium",
          status: "pending",
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
          >(),
          sla_deadline: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(queueItem);
  TestValidator.equals(
    "initial queue status should be pending",
    queueItem.status,
    "pending",
  );

  // Step 3: Assign the queue item to the authenticated moderator
  const updatedQueueItem: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.update(
      connection,
      {
        moderationQueueId: queueItem.id,
        body: {
          status: "assigned",
          assigned_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(updatedQueueItem);

  // Step 4: Validate the assignment and status transition
  TestValidator.equals(
    "queue status should be updated to assigned",
    updatedQueueItem.status,
    "assigned",
  );
  TestValidator.notEquals(
    "assigned_at timestamp should be set",
    updatedQueueItem.assigned_at,
    undefined,
  );
  TestValidator.notEquals(
    "assigned_at timestamp should not be null",
    updatedQueueItem.assigned_at,
    null,
  );

  // Step 5: Verify moderator assignment tracking (handle optional field safely)
  TestValidator.predicate(
    "moderator assignee should be set",
    updatedQueueItem.moderatorAssignee !== undefined &&
      updatedQueueItem.moderatorAssignee !== null,
  );

  if (
    updatedQueueItem.moderatorAssignee !== undefined &&
    updatedQueueItem.moderatorAssignee !== null
  ) {
    TestValidator.equals(
      "moderator assignee ID should match authenticated moderator",
      updatedQueueItem.moderatorAssignee.id,
      moderator.id,
    );
    TestValidator.equals(
      "moderator assignee email should match authenticated moderator",
      updatedQueueItem.moderatorAssignee.email,
      moderator.email,
    );
    TestValidator.equals(
      "moderator assignee display name should match authenticated moderator",
      updatedQueueItem.moderatorAssignee.display_name,
      moderator.display_name,
    );
  }
}
