import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test maintenance schedule search functionality that yields empty results to validate graceful handling of empty result sets.
 * 1. Authenticate as super administrator
 * 2. Perform searches with criteria that should not match any existing maintenance schedules
 * 3. Verify proper empty pagination metadata
 * 4. Ensure response structure remains consistent
 */
export async function test_api_maintenance_schedule_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const authConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create authenticated connection for API calls
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authResult.token.access}` },
  };
  // Helper function to validate empty pagination response
  const validateEmptyPagination = (
    response: IPageIDiscussionBoardMaintenanceSchedule.ISummary,
    testName: string,
  ) => {
    // Use snake_case property names which might match the actual interface
    TestValidator.equals(
      `${testName} - current page should be 1`,
      (response.pagination as any).current_page ?? (response.pagination as any).page,
      1,
    );
    TestValidator.equals(
      `${testName} - limit should match`,
      (response.pagination as any).page_size ?? (response.pagination as any).size,
      (response.pagination as any).page_size ?? (response.pagination as any).size,
    );
    TestValidator.equals(
      `${testName} - records should be 0`,
      (response.pagination as any).total_count ?? (response.pagination as any).total,
      0,
    );
    TestValidator.equals(
      `${testName} - pages should be 0`,
      (response.pagination as any).total_pages ?? (response.pagination as any).pages,
      0,
    );
    TestValidator.equals(
      `${testName} - data array should be empty`,
      response.data.length,
      0,
    );
  };
  // Test 1: Search for non-existent maintenance type
  const nonExistentTypeSearch =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      authenticatedConnection,
      {
        body: {
          maintenance_type: "non_existent_maintenance_type",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(nonExistentTypeSearch);
  validateEmptyPagination(nonExistentTypeSearch, "non-existent type search");
  // Test 2: Search for dates in far future
  const futureDateSearch =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      authenticatedConnection,
      {
        body: {
          scheduled_start_time_from: new Date(
            "2100-01-01T00:00:00Z",
          ).toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(futureDateSearch);
  validateEmptyPagination(futureDateSearch, "future date search");
  // Test 3: Search for dates in distant past
  const pastDateSearch =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      authenticatedConnection,
      {
        body: {
          scheduled_end_time_to: new Date("1900-01-01T00:00:00Z").toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(pastDateSearch);
  validateEmptyPagination(pastDateSearch, "past date search");
  // Test 4: Search with text query that matches no descriptions
  const nonMatchingTextSearch =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      authenticatedConnection,
      {
        body: {
          search: "xyz123_non_matching_query_abc789",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(nonMatchingTextSearch);
  validateEmptyPagination(nonMatchingTextSearch, "non-matching text search");
  // Test 5: Search with combination of non-matching criteria
  const combinedSearch =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      authenticatedConnection,
      {
        body: {
          maintenance_type: "imaginary_maintenance",
          status: "non_existent_status",
          impact_level: "imaginary_impact",
          scheduled_start_time_from: new Date(
            "2100-01-01T00:00:00Z",
          ).toISOString(),
          scheduled_end_time_to: new Date("1900-01-01T00:00:00Z").toISOString(),
          search: "completely_unrelated_search_term",
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(combinedSearch);
  validateEmptyPagination(combinedSearch, "combined search");
}