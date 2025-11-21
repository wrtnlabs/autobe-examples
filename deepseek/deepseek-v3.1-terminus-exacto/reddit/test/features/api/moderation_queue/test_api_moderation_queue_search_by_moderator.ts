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
 * Comprehensive moderation queue search functionality test for moderators.
 *
 * This test validates that moderators can effectively search, filter, and
 * paginate through moderation queues using various criteria including queue
 * type, priority level, status, assignment information, and SLA parameters. It
 * ensures proper sorting, pagination controls, and response structure
 * validation.
 */
export async function test_api_moderation_queue_search_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated moderator context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test basic search with default parameters
  const defaultSearch =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.equals(
    "default search returns page 1",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "default search returns limit 10",
    defaultSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "default search has valid pagination structure",
    defaultSearch.pagination.records >= 0 &&
      defaultSearch.pagination.pages >= 0,
  );

  // Step 3: Test queue type filtering
  const queueTypes = ["reports", "appeals", "automated_flags"] as const;
  for (const queueType of queueTypes) {
    const queueTypeSearch =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            queue_type: queueType,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(queueTypeSearch);
    TestValidator.equals(
      `queue type ${queueType} search returns page 1`,
      queueTypeSearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `queue type ${queueType} search returns limit 5`,
      queueTypeSearch.pagination.limit,
      5,
    );
  }

  // Step 4: Test priority level filtering
  const priorityLevels = ["low", "medium", "high", "critical"] as const;
  for (const priorityLevel of priorityLevels) {
    const prioritySearch =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            priority_level: priorityLevel,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(prioritySearch);
    TestValidator.equals(
      `priority level ${priorityLevel} search returns page 1`,
      prioritySearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `priority level ${priorityLevel} search returns limit 5`,
      prioritySearch.pagination.limit,
      5,
    );
  }

  // Step 5: Test status filtering
  const statuses = ["pending", "assigned", "in_progress", "completed"] as const;
  for (const status of statuses) {
    const statusSearch =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            status: status,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(statusSearch);
    TestValidator.equals(
      `status ${status} search returns page 1`,
      statusSearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `status ${status} search returns limit 5`,
      statusSearch.pagination.limit,
      5,
    );
  }

  // Step 6: Test assignment status filtering
  const assignmentStatuses = ["unassigned", "assigned", "any"] as const;
  for (const assignedTo of assignmentStatuses) {
    const assignmentSearch =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            assigned_to: assignedTo,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(assignmentSearch);
    TestValidator.equals(
      `assignment status ${assignedTo} search returns page 1`,
      assignmentSearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `assignment status ${assignedTo} search returns limit 5`,
      assignmentSearch.pagination.limit,
      5,
    );
  }

  // Step 7: Test pagination controls
  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 10 },
    { page: 1, limit: 20 },
  ];

  for (const paginationTest of paginationTests) {
    const paginationSearch =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            page: paginationTest.page,
            limit: paginationTest.limit,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(paginationSearch);
    TestValidator.equals(
      `pagination page ${paginationTest.page} returns correct page`,
      paginationSearch.pagination.current,
      paginationTest.page,
    );
    TestValidator.equals(
      `pagination limit ${paginationTest.limit} returns correct limit`,
      paginationSearch.pagination.limit,
      paginationTest.limit,
    );
  }

  // Step 8: Test sorting functionality
  const sortingFields = [
    "created_at",
    "priority_level",
    "sla_deadline",
    "assigned_at",
    "processing_time_minutes",
  ] as const;
  const sortingDirections = ["asc", "desc"] as const;

  for (const orderBy of sortingFields) {
    for (const orderDirection of sortingDirections) {
      const sortingSearch =
        await api.functional.communityPlatform.moderator.moderationQueues.index(
          connection,
          {
            body: {
              order_by: orderBy,
              order_direction: orderDirection,
              page: 1,
              limit: 5,
            } satisfies ICommunityPlatformModerationQueue.IRequest,
          },
        );
      typia.assert(sortingSearch);
      TestValidator.equals(
        `sorting by ${orderBy} ${orderDirection} returns page 1`,
        sortingSearch.pagination.current,
        1,
      );
      TestValidator.equals(
        `sorting by ${orderBy} ${orderDirection} returns limit 5`,
        sortingSearch.pagination.limit,
        5,
      );
    }
  }

  // Step 9: Test SLA breach imminent filtering
  const slaBreachSearch =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          sla_breach_imminent: true,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(slaBreachSearch);
  TestValidator.equals(
    "SLA breach imminent search returns page 1",
    slaBreachSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "SLA breach imminent search returns limit 5",
    slaBreachSearch.pagination.limit,
    5,
  );

  // Step 10: Test free-text search
  const textSearch =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(textSearch);
  TestValidator.equals(
    "free-text search returns page 1",
    textSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "free-text search returns limit 5",
    textSearch.pagination.limit,
    5,
  );

  // Step 11: Validate response structure for queue items
  if (defaultSearch.data.length > 0) {
    const sampleQueueItem = defaultSearch.data[0];
    TestValidator.predicate(
      "queue item has required UUID id field",
      typeof sampleQueueItem.id === "string" && sampleQueueItem.id.length > 0,
    );
    TestValidator.predicate(
      "queue item has queue_type field",
      typeof sampleQueueItem.queue_type === "string" &&
        sampleQueueItem.queue_type.length > 0,
    );
    TestValidator.predicate(
      "queue item has priority_level field",
      typeof sampleQueueItem.priority_level === "string" &&
        sampleQueueItem.priority_level.length > 0,
    );
    TestValidator.predicate(
      "queue item has status field",
      typeof sampleQueueItem.status === "string" &&
        sampleQueueItem.status.length > 0,
    );
    TestValidator.predicate(
      "queue item has created_at field with date-time format",
      typeof sampleQueueItem.created_at === "string" &&
        sampleQueueItem.created_at.length > 0,
    );

    // Test optional fields if they exist
    if (sampleQueueItem.processing_time_minutes !== undefined) {
      TestValidator.predicate(
        "queue item processing_time_minutes is valid number",
        typeof sampleQueueItem.processing_time_minutes === "number" &&
          sampleQueueItem.processing_time_minutes >= 0,
      );
    }

    if (sampleQueueItem.sla_deadline !== undefined) {
      TestValidator.predicate(
        "queue item sla_deadline is valid date-time string",
        typeof sampleQueueItem.sla_deadline === "string" &&
          sampleQueueItem.sla_deadline.length > 0,
      );
    }

    if (sampleQueueItem.assigned_at !== undefined) {
      TestValidator.predicate(
        "queue item assigned_at is valid date-time string",
        typeof sampleQueueItem.assigned_at === "string" &&
          sampleQueueItem.assigned_at.length > 0,
      );
    }

    if (sampleQueueItem.completed_at !== undefined) {
      TestValidator.predicate(
        "queue item completed_at is valid date-time string",
        typeof sampleQueueItem.completed_at === "string" &&
          sampleQueueItem.completed_at.length > 0,
      );
    }
  }

  // Step 12: Test error scenario with invalid parameters
  await TestValidator.error(
    "search with invalid page number should fail",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            page: 0, // Invalid: page must be >= 1
            limit: 10,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    },
  );

  await TestValidator.error(
    "search with invalid limit should fail",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            page: 1,
            limit: 0, // Invalid: limit must be >= 1
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    },
  );
}
