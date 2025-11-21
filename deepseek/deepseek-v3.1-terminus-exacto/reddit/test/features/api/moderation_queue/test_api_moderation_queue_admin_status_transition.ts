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
 * Test that administrators can properly transition moderation queue status
 * through the complete workflow lifecycle.
 *
 * This E2E test validates the complete moderation queue workflow where an admin
 * creates a queue item and then systematically transitions its status through
 * the proper sequence: pending → assigned → in_progress → completed. The test
 * ensures that status transitions follow proper workflow rules and that
 * timestamp tracking works correctly for assignment and completion events.
 */
export async function test_api_moderation_queue_admin_status_transition(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for initial queue creation
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

  // Step 2: Create moderation queue item with initial 'pending' status
  const queueData = {
    queue_type: "reports",
    priority_level: "medium",
    status: "pending",
    processing_time_minutes: 30,
    sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      { body: queueData },
    );
  typia.assert(createdQueue);

  // Step 3: Create admin account for status transitions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Transition status from 'pending' to 'assigned'
  const assignedQueue =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: createdQueue.id,
        body: {
          status: "assigned",
          assigned_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(assignedQueue);
  TestValidator.equals(
    "queue status should be assigned",
    assignedQueue.status,
    "assigned",
  );
  TestValidator.predicate(
    "assigned_at timestamp should be set",
    assignedQueue.assigned_at !== undefined,
  );

  // Step 5: Transition status from 'assigned' to 'in_progress'
  const inProgressQueue =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: createdQueue.id,
        body: {
          status: "in_progress",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(inProgressQueue);
  TestValidator.equals(
    "queue status should be in_progress",
    inProgressQueue.status,
    "in_progress",
  );

  // Step 6: Transition status from 'in_progress' to 'completed'
  const completedQueue =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: createdQueue.id,
        body: {
          status: "completed",
          completed_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(completedQueue);
  TestValidator.equals(
    "queue status should be completed",
    completedQueue.status,
    "completed",
  );
  TestValidator.predicate(
    "completed_at timestamp should be set",
    completedQueue.completed_at !== undefined,
  );

  // Step 7: Final validation of workflow completeness
  TestValidator.equals(
    "queue ID should remain consistent throughout workflow",
    completedQueue.id,
    createdQueue.id,
  );
  TestValidator.equals(
    "queue type should remain unchanged",
    completedQueue.queue_type,
    createdQueue.queue_type,
  );
  TestValidator.equals(
    "priority level should remain unchanged",
    completedQueue.priority_level,
    createdQueue.priority_level,
  );

  // Step 8: Validate workflow sequence integrity
  TestValidator.predicate(
    "assigned_at should be before completed_at",
    assignedQueue.assigned_at !== undefined &&
      completedQueue.completed_at !== undefined &&
      new Date(assignedQueue.assigned_at) <
        new Date(completedQueue.completed_at),
  );
}
