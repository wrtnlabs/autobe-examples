import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";

/**
 * Test comprehensive moderation queue search functionality for administrators
 * with full system access.
 *
 * This test validates that administrators can search across all queue types
 * with advanced filtering capabilities including SLA breach imminent filtering,
 * complex multi-criteria searches, and comprehensive status tracking. The test
 * follows a complete workflow: 1) Create an administrator account for
 * authentication, 2) Perform various moderation queue searches with different
 * filter combinations, 3) Validate that admin searches return complete queue
 * information including assignment details, processing timelines, and
 * moderation report/action references, 4) Test pagination with large result
 * sets, 5) Verify that administrators can effectively monitor platform-wide
 * moderation workflows.
 */
export async function test_api_moderation_queue_admin_comprehensive_search(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
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

  // 2. Test basic search without filters (should return all queues)
  const allQueues: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(allQueues);
  TestValidator.equals(
    "pagination should be valid",
    allQueues.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be respected",
    allQueues.pagination.limit <= 10,
  );

  // 3. Test search with specific queue type filter
  const queueTypes = [
    "reports",
    "appeals",
    "automated_flags",
    "user_reviews",
    "content_reviews",
  ] as const;

  for (const queueType of queueTypes) {
    const filteredQueues: IPageICommunityPlatformModerationQueue.ISummary =
      await api.functional.communityPlatform.admin.moderationQueues.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            queue_type: queueType,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(filteredQueues);

    // Validate that all returned queues match the requested type
    if (filteredQueues.data.length > 0) {
      TestValidator.predicate(
        `all queues should be of type ${queueType}`,
        filteredQueues.data.every((queue) => queue.queue_type === queueType),
      );
    }
  }

  // 4. Test search with priority level filter
  const priorityLevels = ["low", "medium", "high", "critical"] as const;

  for (const priorityLevel of priorityLevels) {
    const priorityQueues: IPageICommunityPlatformModerationQueue.ISummary =
      await api.functional.communityPlatform.admin.moderationQueues.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            priority_level: priorityLevel,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(priorityQueues);

    // Validate that all returned queues match the requested priority
    if (priorityQueues.data.length > 0) {
      TestValidator.predicate(
        `all queues should have priority ${priorityLevel}`,
        priorityQueues.data.every(
          (queue) => queue.priority_level === priorityLevel,
        ),
      );
    }
  }

  // 5. Test search with status filter
  const statuses = [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "escalated",
  ] as const;

  for (const status of statuses) {
    const statusQueues: IPageICommunityPlatformModerationQueue.ISummary =
      await api.functional.communityPlatform.admin.moderationQueues.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            status: status,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(statusQueues);

    // Validate that all returned queues match the requested status
    if (statusQueues.data.length > 0) {
      TestValidator.predicate(
        `all queues should have status ${status}`,
        statusQueues.data.every((queue) => queue.status === status),
      );
    }
  }

  // 6. Test search with SLA breach imminent filter
  const slaQueues: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          sla_breach_imminent: true,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(slaQueues);

  // 7. Test search with multiple filter combinations
  const complexSearch: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          queue_type: "reports",
          priority_level: "high",
          status: "pending",
          order_by: "priority_level",
          order_direction: "desc",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(complexSearch);

  // 8. Test pagination with different page sizes
  const paginationTest: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "page should be 2",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 3", paginationTest.pagination.limit, 3);

  // 9. Test search with ordering
  const orderedQueues: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(orderedQueues);

  // 10. Validate queue structure completeness
  if (allQueues.data.length > 0) {
    const sampleQueue = allQueues.data[0];
    TestValidator.predicate(
      "queue should have id",
      sampleQueue.id !== undefined,
    );
    TestValidator.predicate(
      "queue should have type",
      sampleQueue.queue_type !== undefined,
    );
    TestValidator.predicate(
      "queue should have priority",
      sampleQueue.priority_level !== undefined,
    );
    TestValidator.predicate(
      "queue should have status",
      sampleQueue.status !== undefined,
    );
    TestValidator.predicate(
      "queue should have creation timestamp",
      sampleQueue.created_at !== undefined,
    );

    // Optional fields that may be present
    if (sampleQueue.processing_time_minutes !== undefined) {
      TestValidator.predicate(
        "processing time should be positive if present",
        sampleQueue.processing_time_minutes > 0,
      );
    }

    if (sampleQueue.moderation_report !== undefined) {
      TestValidator.predicate(
        "moderation report should have valid structure",
        sampleQueue.moderation_report.id !== undefined &&
          sampleQueue.moderation_report.report_type !== undefined &&
          sampleQueue.moderation_report.status !== undefined &&
          sampleQueue.moderation_report.created_at !== undefined,
      );
    }

    if (sampleQueue.moderation_action !== undefined) {
      TestValidator.predicate(
        "moderation action should have valid structure",
        sampleQueue.moderation_action.id !== undefined &&
          sampleQueue.moderation_action.action_type !== undefined &&
          sampleQueue.moderation_action.status !== undefined &&
          sampleQueue.moderation_action.created_at !== undefined,
      );
    }
  }
}
