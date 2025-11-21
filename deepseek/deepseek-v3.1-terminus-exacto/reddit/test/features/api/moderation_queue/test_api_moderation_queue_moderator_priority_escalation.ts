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
 * Test that moderators can escalate queue priority levels when encountering
 * complex moderation cases.
 *
 * This test validates the priority escalation workflow in community platform
 * moderation queues. A moderator creates a standard priority queue item and
 * then escalates it to high priority due to complexity, ensuring that
 * moderators can adjust processing urgency based on case complexity and that
 * the system properly supports priority escalation workflows.
 */
export async function test_api_moderation_queue_moderator_priority_escalation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
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

  // Step 2: Create a standard priority moderation queue item
  const initialQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "reports",
          priority_level: "medium",
          status: "pending",
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<60>
          >(),
          sla_deadline: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(), // 24 hours from now
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(initialQueue);

  // Step 3: Escalate the queue priority to high due to complexity
  const escalatedQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.update(
      connection,
      {
        moderationQueueId: initialQueue.id,
        body: {
          priority_level: "high",
          status: "assigned",
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
          >(),
          sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now (urgent)
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(escalatedQueue);

  // Step 4: Validate the priority escalation was successful
  TestValidator.equals(
    "queue ID should remain unchanged after priority escalation",
    escalatedQueue.id,
    initialQueue.id,
  );
  TestValidator.equals(
    "priority level should be escalated from medium to high",
    escalatedQueue.priority_level,
    "high",
  );
  TestValidator.notEquals(
    "status should change from pending to assigned",
    escalatedQueue.status,
    "pending",
  );
  TestValidator.predicate(
    "SLA deadline should be shortened for high priority items",
    new Date(escalatedQueue.sla_deadline!).getTime() <
      new Date(initialQueue.sla_deadline!).getTime(),
  );
  TestValidator.predicate(
    "processing time should reflect increased complexity",
    escalatedQueue.processing_time_minutes! >=
      initialQueue.processing_time_minutes!,
  );

  // Step 5: Test invalid priority escalation (should fail)
  await TestValidator.error(
    "should not allow invalid priority level escalation",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.update(
        connection,
        {
          moderationQueueId: initialQueue.id,
          body: {
            priority_level: "invalid_priority", // Invalid priority level
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );

  // Step 6: Validate moderator assignment tracking
  TestValidator.predicate(
    "moderator should be properly assigned to escalated queue",
    escalatedQueue.moderatorAssignee !== undefined,
  );
}
