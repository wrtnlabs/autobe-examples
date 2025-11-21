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
 * Test the complete moderation workflow from creation to completion by a
 * moderator.
 *
 * This E2E test validates the end-to-end moderation workflow including:
 *
 * - Moderator authentication and authorization
 * - Moderation queue item creation with proper initial status
 * - Queue assignment and status transitions
 * - Completion workflow with timestamp tracking
 * - Business logic validation for moderation operations
 */
export async function test_api_moderation_queue_moderator_completion_workflow(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to establish proper authorization context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a moderation queue item for completion workflow testing
  const queueItem =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "reports",
          priority_level: "medium",
          status: "pending",
          processing_time_minutes: 30,
          sla_deadline: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(queueItem);

  // Step 3: Update the queue item to simulate moderator assignment and processing
  const updatedQueueItem =
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

  // Step 4: Mark the queue item as completed with proper timestamp tracking
  const completedQueueItem =
    await api.functional.communityPlatform.moderator.moderationQueues.update(
      connection,
      {
        moderationQueueId: queueItem.id,
        body: {
          status: "completed",
          completed_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(completedQueueItem);

  // Step 5: Validate the complete workflow including status transitions and timestamp tracking
  TestValidator.equals(
    "queue ID remains consistent throughout workflow",
    completedQueueItem.id,
    queueItem.id,
  );
  TestValidator.equals(
    "queue type remains unchanged",
    completedQueueItem.queue_type,
    queueItem.queue_type,
  );
  TestValidator.equals(
    "priority level remains unchanged",
    completedQueueItem.priority_level,
    queueItem.priority_level,
  );
  TestValidator.equals(
    "final status should be completed",
    completedQueueItem.status,
    "completed",
  );
  TestValidator.predicate(
    "assigned_at timestamp should be set",
    completedQueueItem.assigned_at !== undefined,
  );
  TestValidator.predicate(
    "completed_at timestamp should be set",
    completedQueueItem.completed_at !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp should be set",
    completedQueueItem.created_at !== undefined,
  );

  // Validate timestamp sequence: created_at <= assigned_at <= completed_at
  if (completedQueueItem.assigned_at && completedQueueItem.completed_at) {
    const createdTime = new Date(completedQueueItem.created_at).getTime();
    const assignedTime = new Date(completedQueueItem.assigned_at).getTime();
    const completedTime = new Date(completedQueueItem.completed_at).getTime();

    TestValidator.predicate(
      "created_at should be before assigned_at",
      createdTime <= assignedTime,
    );
    TestValidator.predicate(
      "assigned_at should be before completed_at",
      assignedTime <= completedTime,
    );
  }
}
