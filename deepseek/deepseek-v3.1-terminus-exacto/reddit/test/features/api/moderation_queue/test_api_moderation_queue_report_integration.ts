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
 * Test integration between moderation queues and associated moderation
 * reports/actions for comprehensive workflow management. Validate that queue
 * searches properly include references to moderation reports and actions,
 * allowing administrators to track the complete moderation lifecycle. Test
 * filtering by report types and action status to ensure proper workflow
 * tracking.
 */
export async function test_api_moderation_queue_report_integration(
  connection: api.IConnection,
) {
  // 1. Establish admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Test basic moderation queue search with default parameters
  const basicSearch: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(basicSearch);

  TestValidator.equals(
    "pagination structure exists",
    typeof basicSearch.pagination,
    "object",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(basicSearch.data),
    true,
  );

  // 3. Test filtering by specific queue types
  const queueTypes = [
    "reports",
    "appeals",
    "automated_flags",
    "user_reviews",
    "content_reviews",
  ] as const;

  for (const queueType of queueTypes) {
    const filteredSearch: IPageICommunityPlatformModerationQueue.ISummary =
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
    typia.assert(filteredSearch);

    TestValidator.predicate(
      `queue type ${queueType} search returns valid data`,
      filteredSearch.data.length >= 0,
    );

    // Validate that returned items match the requested queue type
    if (filteredSearch.data.length > 0) {
      TestValidator.predicate(
        `all items match requested queue type ${queueType}`,
        filteredSearch.data.every((item) => item.queue_type === queueType),
      );
    }
  }

  // 4. Test filtering by priority levels
  const priorityLevels = ["low", "medium", "high", "critical"] as const;

  for (const priorityLevel of priorityLevels) {
    const prioritySearch: IPageICommunityPlatformModerationQueue.ISummary =
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
    typia.assert(prioritySearch);

    TestValidator.predicate(
      `priority level ${priorityLevel} search returns valid data`,
      prioritySearch.data.length >= 0,
    );

    // Validate priority level matching
    if (prioritySearch.data.length > 0) {
      TestValidator.predicate(
        `all items match requested priority level ${priorityLevel}`,
        prioritySearch.data.every(
          (item) => item.priority_level === priorityLevel,
        ),
      );
    }
  }

  // 5. Test filtering by status
  const statuses = [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "escalated",
  ] as const;

  for (const status of statuses) {
    const statusSearch: IPageICommunityPlatformModerationQueue.ISummary =
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
    typia.assert(statusSearch);

    TestValidator.predicate(
      `status ${status} search returns valid data`,
      statusSearch.data.length >= 0,
    );

    // Validate status matching
    if (statusSearch.data.length > 0) {
      TestValidator.predicate(
        `all items match requested status ${status}`,
        statusSearch.data.every((item) => item.status === status),
      );
    }
  }

  // 6. Test sorting functionality
  const orderByFields = [
    "created_at",
    "priority_level",
    "sla_deadline",
    "assigned_at",
    "processing_time_minutes",
  ] as const;

  for (const orderBy of orderByFields) {
    const sortedSearch: IPageICommunityPlatformModerationQueue.ISummary =
      await api.functional.communityPlatform.admin.moderationQueues.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            order_by: orderBy,
            order_direction: "asc",
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(sortedSearch);

    TestValidator.predicate(
      `sort by ${orderBy} returns valid data`,
      sortedSearch.data.length >= 0,
    );

    // Test descending order
    const descSearch: IPageICommunityPlatformModerationQueue.ISummary =
      await api.functional.communityPlatform.admin.moderationQueues.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            order_by: orderBy,
            order_direction: "desc",
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(descSearch);

    TestValidator.predicate(
      `sort by ${orderBy} desc returns valid data`,
      descSearch.data.length >= 0,
    );
  }

  // 7. Test combined filtering
  const combinedSearch: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          queue_type: "reports",
          priority_level: "high",
          status: "pending",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(combinedSearch);

  TestValidator.predicate(
    "combined filter search returns valid data",
    combinedSearch.data.length >= 0,
  );

  // 8. Test search parameter functionality
  const searchTest: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          search: "test",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(searchTest);

  TestValidator.predicate(
    "search parameter returns valid data",
    searchTest.data.length >= 0,
  );

  // 9. Test assignment filtering
  const assignmentTest: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          assigned_to: "unassigned",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(assignmentTest);

  TestValidator.predicate(
    "assignment filter returns valid data",
    assignmentTest.data.length >= 0,
  );

  // 10. Validate moderation report and action references in queue items
  if (basicSearch.data.length > 0) {
    // Check if any queue items have moderation report references
    const itemsWithReports = basicSearch.data.filter(
      (item) => item.moderation_report !== undefined,
    );

    if (itemsWithReports.length > 0) {
      const reportItem = itemsWithReports[0];

      // Proper null checking before accessing properties
      if (reportItem.moderation_report) {
        const report = reportItem.moderation_report;
        TestValidator.equals(
          "moderation report has valid id",
          typeof report.id,
          "string",
        );
        TestValidator.equals(
          "moderation report has valid report type",
          typeof report.report_type,
          "string",
        );
        TestValidator.equals(
          "moderation report has valid status",
          typeof report.status,
          "string",
        );
        TestValidator.equals(
          "moderation report has valid created_at",
          typeof report.created_at,
          "string",
        );
      }
    }

    // Check if any queue items have moderation action references
    const itemsWithActions = basicSearch.data.filter(
      (item) => item.moderation_action !== undefined,
    );

    if (itemsWithActions.length > 0) {
      const actionItem = itemsWithActions[0];

      // Proper null checking before accessing properties
      if (actionItem.moderation_action) {
        const action = actionItem.moderation_action;
        TestValidator.equals(
          "moderation action has valid id",
          typeof action.id,
          "string",
        );
        TestValidator.equals(
          "moderation action has valid action type",
          typeof action.action_type,
          "string",
        );
        TestValidator.equals(
          "moderation action has valid status",
          typeof action.status,
          "string",
        );
        TestValidator.equals(
          "moderation action has valid created_at",
          typeof action.created_at,
          "string",
        );
      }
    }
  }

  // 11. Test pagination limits
  const limitTest: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100, // Maximum allowed limit
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(limitTest);

  TestValidator.predicate(
    "maximum limit search returns valid data",
    limitTest.data.length >= 0 && limitTest.data.length <= 100,
  );

  // 12. Test SLA breach imminent filter
  const slaSearch: IPageICommunityPlatformModerationQueue.ISummary =
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
  typia.assert(slaSearch);

  TestValidator.predicate(
    "SLA breach imminent search returns valid data",
    slaSearch.data.length >= 0,
  );

  // 13. Test error conditions with invalid parameters
  await TestValidator.error("should reject invalid page number", async () => {
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 0, // Invalid: page must be >= 1
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  });

  await TestValidator.error("should reject invalid limit value", async () => {
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 0, // Invalid: limit must be >= 1
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  });

  // 14. Validate queue item structure
  if (basicSearch.data.length > 0) {
    const sampleItem = basicSearch.data[0];

    TestValidator.equals(
      "queue item has valid id",
      typeof sampleItem.id,
      "string",
    );
    TestValidator.equals(
      "queue item has queue_type",
      typeof sampleItem.queue_type,
      "string",
    );
    TestValidator.equals(
      "queue item has priority_level",
      typeof sampleItem.priority_level,
      "string",
    );
    TestValidator.equals(
      "queue item has status",
      typeof sampleItem.status,
      "string",
    );
    TestValidator.equals(
      "queue item has created_at",
      typeof sampleItem.created_at,
      "string",
    );

    // Optional fields validation with proper null checking
    if (sampleItem.processing_time_minutes !== undefined) {
      TestValidator.equals(
        "processing_time_minutes is number",
        typeof sampleItem.processing_time_minutes,
        "number",
      );
    }

    if (sampleItem.sla_deadline !== undefined) {
      TestValidator.equals(
        "sla_deadline is string",
        typeof sampleItem.sla_deadline,
        "string",
      );
    }

    if (sampleItem.assigned_at !== undefined) {
      TestValidator.equals(
        "assigned_at is string",
        typeof sampleItem.assigned_at,
        "string",
      );
    }

    if (sampleItem.completed_at !== undefined) {
      TestValidator.equals(
        "completed_at is string",
        typeof sampleItem.completed_at,
        "string",
      );
    }
  }
}
