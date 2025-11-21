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
 * Test SLA monitoring and deadline management functionality for administrators.
 *
 * This E2E test validates that administrators can effectively monitor
 * moderation queues with imminent SLA breaches and manage workflow compliance.
 * The test creates an admin account, then exercises the moderation queue search
 * API with various SLA-related filters and sorting options to ensure timely
 * moderation action prioritization.
 */
export async function test_api_moderation_queue_sla_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for SLA monitoring
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "moderation",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test SLA breach imminent filtering
  const slaBreachResults: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          sla_breach_imminent: true,
          page: 1,
          limit: 10,
          order_by: "sla_deadline",
          order_direction: "asc",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(slaBreachResults);

  TestValidator.equals(
    "pagination current page should be 1",
    slaBreachResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    slaBreachResults.pagination.limit,
    10,
  );

  // Step 3: Test priority-based sorting
  const priorityResults: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          order_by: "priority_level",
          order_direction: "desc",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(priorityResults);

  TestValidator.equals(
    "priority results page should be 1",
    priorityResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "priority results limit should be 5",
    priorityResults.pagination.limit,
    5,
  );

  // Step 4: Test combined filtering with queue type and status
  const combinedResults: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          queue_type: "reports",
          status: "pending",
          sla_breach_imminent: true,
          order_by: "sla_deadline",
          order_direction: "asc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(combinedResults);

  TestValidator.equals(
    "combined results page should be 1",
    combinedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined results limit should be 20",
    combinedResults.pagination.limit,
    20,
  );

  // Step 5: Test default pagination (no filters)
  const defaultResults: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(defaultResults);

  TestValidator.predicate(
    "total records should be non-negative",
    defaultResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count should be valid",
    defaultResults.pagination.pages >= 0,
  );
  TestValidator.equals(
    "default results page should be 1",
    defaultResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "default results limit should be 15",
    defaultResults.pagination.limit,
    15,
  );
}
