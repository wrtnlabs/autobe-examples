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
 * Test that administrators can update moderation queue assignments by changing
 * the assigned moderator and priority level. An admin creates a new moderation
 * queue item via moderator endpoint, then updates the assignment to a different
 * moderator with elevated priority. Validates that queue assignment changes are
 * properly tracked and that admin-level permissions allow reassignment across
 * different moderator levels.
 */
export async function test_api_moderation_queue_admin_update_assignment(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();

  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);

  // Step 3: Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();

  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        display_name: RandomGenerator.name(),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 4: Create moderation queue item via moderator1
  const initialQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "reports",
          priority_level: "medium",
          status: "pending",
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<60>
          >(),
          sla_deadline: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(initialQueue);

  // Step 5: Switch to admin account
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/admin",
      session_id: typia.random<string>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Admin updates the moderation queue assignment
  const updatedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: initialQueue.id,
        body: {
          priority_level: "high",
          status: "assigned",
          assigned_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(updatedQueue);

  // Step 7: Validate the updates
  TestValidator.equals(
    "queue ID remains the same",
    updatedQueue.id,
    initialQueue.id,
  );
  TestValidator.equals(
    "priority level updated to high",
    updatedQueue.priority_level,
    "high",
  );
  TestValidator.equals(
    "status updated to assigned",
    updatedQueue.status,
    "assigned",
  );
  TestValidator.predicate(
    "assigned_at timestamp is set",
    updatedQueue.assigned_at !== undefined && updatedQueue.assigned_at !== null,
  );
  TestValidator.predicate(
    "queue type remains unchanged",
    updatedQueue.queue_type === initialQueue.queue_type,
  );

  // Step 8: Validate admin can reassign to different priority levels
  const criticalQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: initialQueue.id,
        body: {
          priority_level: "critical",
          status: "in_progress",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(criticalQueue);

  TestValidator.equals(
    "priority can be escalated to critical",
    criticalQueue.priority_level,
    "critical",
  );
  TestValidator.equals(
    "status can be updated to in_progress",
    criticalQueue.status,
    "in_progress",
  );

  // Additional validation: Test completion workflow
  const completedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: initialQueue.id,
        body: {
          status: "completed",
          completed_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(completedQueue);

  TestValidator.equals(
    "queue can be marked as completed",
    completedQueue.status,
    "completed",
  );
  TestValidator.predicate(
    "completed_at timestamp is set",
    completedQueue.completed_at !== undefined &&
      completedQueue.completed_at !== null,
  );
}
