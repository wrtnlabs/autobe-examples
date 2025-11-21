import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";

/**
 * Test priority-based filtering of moderation queues for efficient workload
 * management.
 *
 * This scenario focuses on filtering queues by priority levels (low, medium,
 * high, critical) to ensure moderators can prioritize urgent tasks. Validate
 * that high and critical priority items appear first when sorted by priority,
 * and test SLA deadline filtering for items with imminent deadlines. Verify
 * that priority levels correctly influence queue positioning and that
 * moderators can effectively identify time-sensitive moderation tasks requiring
 * immediate attention.
 */
export async function test_api_moderation_queue_priority_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test priority filtering with different priority levels
  const priorityLevels = ["low", "medium", "high", "critical"] as const;

  for (const priorityLevel of priorityLevels) {
    const filteredQueues =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            priority_level: priorityLevel,
            limit: 10,
            page: 1,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(filteredQueues);

    TestValidator.predicate(
      `priority filter ${priorityLevel} returns valid page structure`,
      filteredQueues.pagination !== undefined &&
        filteredQueues.data !== undefined,
    );

    // Validate that filtered results match the requested priority level
    if (filteredQueues.data.length > 0) {
      TestValidator.predicate(
        `all returned queues match priority level ${priorityLevel}`,
        filteredQueues.data.every(
          (queue) => queue.priority_level === priorityLevel,
        ),
      );
    }
  }

  // Step 3: Test priority-based sorting (high priority first)
  const sortedQueues =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          order_by: "priority_level",
          order_direction: "desc",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(sortedQueues);

  // Validate that queues are actually sorted by priority (high first)
  if (sortedQueues.data.length > 1) {
    const priorityOrder = ["critical", "high", "medium", "low"];

    for (let i = 0; i < sortedQueues.data.length - 1; i++) {
      const currentPriority = sortedQueues.data[i].priority_level;
      const nextPriority = sortedQueues.data[i + 1].priority_level;

      const currentIndex = priorityOrder.indexOf(currentPriority);
      const nextIndex = priorityOrder.indexOf(nextPriority);

      TestValidator.predicate(
        `queue ${i} priority ${currentPriority} should be >= queue ${i + 1} priority ${nextPriority}`,
        currentIndex <= nextIndex,
      );
    }
  }

  // Step 4: Test SLA breach imminent filtering
  const slaFilteredQueues =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          sla_breach_imminent: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(slaFilteredQueues);

  // Step 5: Validate that priority levels influence queue positioning
  const allQueues =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          limit: 50,
          page: 1,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(allQueues);

  TestValidator.predicate(
    "moderation queues API returns valid data structure",
    allQueues.data.every(
      (queue) =>
        queue.id !== undefined &&
        queue.queue_type !== undefined &&
        queue.priority_level !== undefined &&
        queue.status !== undefined &&
        queue.created_at !== undefined,
    ),
  );

  // Validate that priority levels are correctly assigned
  const validPriorities = ["low", "medium", "high", "critical"];
  TestValidator.predicate(
    "all queues have valid priority levels",
    allQueues.data.every((queue) =>
      validPriorities.includes(queue.priority_level),
    ),
  );

  // Test combination of priority filtering and sorting
  const combinedFilter =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          priority_level: "high",
          order_by: "created_at",
          order_direction: "desc",
          limit: 15,
          page: 1,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(combinedFilter);

  if (combinedFilter.data.length > 0) {
    TestValidator.predicate(
      "combined filter returns only high priority queues",
      combinedFilter.data.every((queue) => queue.priority_level === "high"),
    );
  }
}
