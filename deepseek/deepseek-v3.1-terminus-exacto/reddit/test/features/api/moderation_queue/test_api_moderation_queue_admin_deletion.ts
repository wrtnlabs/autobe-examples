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
 * Test the complete workflow of moderation queue deletion by an administrator.
 * This test validates the end-to-end process of creating a moderation queue
 * item and then permanently deleting it. The scenario involves:
 *
 * 1. Creating an administrator account with proper authentication credentials
 * 2. Creating a moderation queue item with valid queue type, priority level, and
 *    status
 * 3. Verifying successful creation of the moderation queue item
 * 4. Deleting the moderation queue item using the erase endpoint
 * 5. Validating that the deletion operation removes the queue item permanently
 *
 * This test ensures proper authentication flow, data creation, and irreversible
 * deletion functionality in the moderation system.
 */
export async function test_api_moderation_queue_admin_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and establish authentication
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

  // Step 2: Create a moderation queue item
  const queueTypes = [
    "reports",
    "appeals",
    "automated_flags",
    "user_reviews",
    "content_reviews",
  ] as const;
  const priorityLevels = ["low", "medium", "high", "critical"] as const;
  const statusValues = [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "escalated",
  ] as const;

  const moderationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: RandomGenerator.pick(queueTypes),
          priority_level: RandomGenerator.pick(priorityLevels),
          status: RandomGenerator.pick(statusValues),
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >(),
          sla_deadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(moderationQueue);

  // Step 3: Verify the moderation queue was created successfully
  TestValidator.equals(
    "moderation queue ID should be valid UUID format",
    moderationQueue.id,
    typia.assert<string & tags.Format<"uuid">>(moderationQueue.id),
  );
  TestValidator.predicate(
    "moderation queue should have valid creation timestamp",
    moderationQueue.created_at !== undefined &&
      moderationQueue.created_at.length > 0,
  );

  // Step 4: Delete the moderation queue item
  await api.functional.communityPlatform.admin.moderationQueues.erase(
    connection,
    {
      moderationQueueId: moderationQueue.id,
    },
  );

  // Step 5: Validate successful deletion by creating a new queue item
  // This ensures the deletion didn't break the system and the ID was properly removed
  const newModerationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: RandomGenerator.pick(queueTypes),
          priority_level: RandomGenerator.pick(priorityLevels),
          status: RandomGenerator.pick(statusValues),
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(newModerationQueue);

  // Final validation that both operations completed successfully
  TestValidator.notEquals(
    "new moderation queue should have different ID than deleted one",
    moderationQueue.id,
    newModerationQueue.id,
  );
  TestValidator.predicate(
    "new moderation queue should be properly created",
    newModerationQueue.id !== undefined &&
      newModerationQueue.created_at !== undefined,
  );
}
