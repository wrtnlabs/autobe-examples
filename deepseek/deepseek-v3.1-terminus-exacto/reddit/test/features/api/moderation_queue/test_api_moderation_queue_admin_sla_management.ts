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
 * Test that administrators can update SLA deadlines and processing time
 * estimates for moderation queues.
 *
 * This test validates the complete SLA management workflow:
 *
 * 1. Creates moderator and admin accounts for multi-actor testing
 * 2. Establishes a moderation queue item with initial SLA settings
 * 3. Authenticates as admin to gain SLA management permissions
 * 4. Updates queue SLA deadlines and processing time estimates
 * 5. Verifies that SLA calculations and processing adjustments work correctly
 */
export async function test_api_moderation_queue_admin_sla_management(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
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

  // Step 2: Create admin account with super admin privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create moderation queue item with initial SLA settings
  const queueItem: ICommunityPlatformModerationQueue =
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
          ).toISOString(), // 24 hours SLA
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(queueItem);

  // Step 4: Authenticate as admin for SLA management
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://community-platform.test/admin",
      referrer: "https://community-platform.test/",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Update moderation queue with new SLA settings
  const updatedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: queueItem.id,
        body: {
          priority_level: "high",
          processing_time_minutes: 15,
          sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours SLA for high priority
          assigned_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(updatedQueue);

  // Step 6: Validate SLA management updates
  TestValidator.equals(
    "priority level should be updated to high",
    updatedQueue.priority_level,
    "high",
  );
  TestValidator.equals(
    "processing time should be reduced for high priority",
    updatedQueue.processing_time_minutes,
    15,
  );
  TestValidator.notEquals(
    "SLA deadline should be different after update",
    updatedQueue.sla_deadline,
    queueItem.sla_deadline,
  );
  TestValidator.predicate(
    "queue should be assigned after SLA update",
    updatedQueue.assigned_at !== null && updatedQueue.assigned_at !== undefined,
  );

  // Step 7: Test additional SLA adjustment for critical priority
  const criticalUpdate: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: queueItem.id,
        body: {
          priority_level: "critical",
          processing_time_minutes: 5,
          sla_deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour SLA for critical
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(criticalUpdate);

  // Final validation of critical SLA settings
  TestValidator.equals(
    "critical priority should have shortest processing time",
    criticalUpdate.processing_time_minutes,
    5,
  );
  TestValidator.predicate(
    "critical SLA should be the most urgent",
    new Date(criticalUpdate.sla_deadline!).getTime() <
      new Date(updatedQueue.sla_deadline!).getTime(),
  );
}
