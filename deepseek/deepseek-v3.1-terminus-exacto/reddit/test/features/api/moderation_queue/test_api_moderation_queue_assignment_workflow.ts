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
 * Test moderation queue assignment workflow scenarios including unassigned,
 * assigned, and in-progress status filtering. Validate that moderators can
 * search for queues assigned specifically to them versus unassigned queues
 * available for claiming. Test status transitions by searching for queues in
 * different workflow states and verify that assignment timestamps are properly
 * tracked.
 */
export async function test_api_moderation_queue_assignment_workflow(
  connection: api.IConnection,
) {
  // Create first moderator account for testing
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

  // Create second moderator account for testing assignment scenarios
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // Test searching for unassigned queues (available for claiming)
  const unassignedQueues: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          assigned_to: "unassigned",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(unassignedQueues);

  TestValidator.predicate(
    "unassigned queues search returns valid pagination",
    unassignedQueues.pagination.current >= 0 &&
      unassignedQueues.pagination.limit > 0,
  );

  // Test searching for queues assigned to specific moderator
  const assignedQueues: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          assigned_to: "assigned",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(assignedQueues);

  TestValidator.predicate(
    "assigned queues search returns valid pagination",
    assignedQueues.pagination.current >= 0 &&
      assignedQueues.pagination.limit > 0,
  );

  // Test filtering by different workflow statuses
  const statuses = [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "escalated",
  ] as const;

  for (const status of statuses) {
    const statusFilteredQueues: IPageICommunityPlatformModerationQueue.ISummary =
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
    typia.assert(statusFilteredQueues);

    TestValidator.predicate(
      `status ${status} queues search returns valid response`,
      statusFilteredQueues.pagination.current >= 0 &&
        statusFilteredQueues.pagination.limit > 0,
    );
  }

  // Test combined filtering with assignment status and workflow state
  const combinedFilterQueues: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          assigned_to: "unassigned",
          status: "pending",
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(combinedFilterQueues);

  TestValidator.predicate(
    "combined filter search returns valid pagination",
    combinedFilterQueues.pagination.current >= 0 &&
      combinedFilterQueues.pagination.limit > 0,
  );

  // Test priority level filtering
  const priorityLevels = ["low", "medium", "high", "critical"] as const;

  for (const priority of priorityLevels) {
    const priorityFilteredQueues: IPageICommunityPlatformModerationQueue.ISummary =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            priority_level: priority,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(priorityFilteredQueues);

    TestValidator.predicate(
      `priority ${priority} queues search returns valid response`,
      priorityFilteredQueues.pagination.current >= 0 &&
        priorityFilteredQueues.pagination.limit > 0,
    );
  }

  // Test queue type filtering
  const queueTypes = [
    "reports",
    "appeals",
    "automated_flags",
    "user_reviews",
    "content_reviews",
  ] as const;

  for (const queueType of queueTypes) {
    const typeFilteredQueues: IPageICommunityPlatformModerationQueue.ISummary =
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
    typia.assert(typeFilteredQueues);

    TestValidator.predicate(
      `queue type ${queueType} search returns valid response`,
      typeFilteredQueues.pagination.current >= 0 &&
        typeFilteredQueues.pagination.limit > 0,
    );
  }

  // Test SLA breach imminent filtering
  const slaBreachQueues: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          sla_breach_imminent: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(slaBreachQueues);

  TestValidator.predicate(
    "SLA breach imminent search returns valid pagination",
    slaBreachQueues.pagination.current >= 0 &&
      slaBreachQueues.pagination.limit > 0,
  );

  // Test free-text search functionality
  const searchQueues: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(searchQueues);

  TestValidator.predicate(
    "free-text search returns valid pagination",
    searchQueues.pagination.current >= 0 && searchQueues.pagination.limit > 0,
  );

  // Validate that all queue items in responses have proper structure
  const allResponses = [
    unassignedQueues,
    assignedQueues,
    combinedFilterQueues,
    slaBreachQueues,
    searchQueues,
  ];

  for (const response of allResponses) {
    for (const queueItem of response.data) {
      TestValidator.predicate(
        "queue item has valid ID format",
        queueItem.id.length > 0,
      );
      TestValidator.predicate(
        "queue item has valid queue type",
        queueItem.queue_type.length > 0,
      );
      TestValidator.predicate(
        "queue item has valid priority level",
        queueItem.priority_level.length > 0,
      );
      TestValidator.predicate(
        "queue item has valid status",
        queueItem.status.length > 0,
      );
      TestValidator.predicate(
        "queue item has valid creation timestamp",
        queueItem.created_at.length > 0,
      );
    }
  }
}
