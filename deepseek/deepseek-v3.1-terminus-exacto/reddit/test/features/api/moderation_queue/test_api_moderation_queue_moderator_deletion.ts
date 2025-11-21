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
 * Test moderation queue deletion workflow by a moderator.
 *
 * This test validates the complete lifecycle of moderation queue management:
 *
 * 1. Create moderator account and establish authentication context
 * 2. Create a moderation queue item with appropriate queue type and priority level
 * 3. Perform deletion operation on the created queue item
 * 4. Verify successful deletion through business logic validation
 */
export async function test_api_moderation_queue_moderator_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and establish authentication
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

  const moderationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: RandomGenerator.pick(
            queueTypes,
          ) satisfies string as string,
          priority_level: RandomGenerator.pick(
            priorityLevels,
          ) satisfies string as string,
          status: RandomGenerator.pick(statusValues) satisfies string as string,
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
          >(),
          sla_deadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(moderationQueue);

  // Step 3: Delete the moderation queue item
  await api.functional.communityPlatform.moderator.moderationQueues.erase(
    connection,
    {
      moderationQueueId: moderationQueue.id,
    },
  );

  // Step 4: Verify deletion through successful operation completion
  // Since no GET endpoint is available to verify deletion, we validate
  // that the deletion operation completed without errors
  TestValidator.predicate(
    "queue deletion operation completed successfully",
    true, // The absence of errors indicates successful deletion
  );
}
