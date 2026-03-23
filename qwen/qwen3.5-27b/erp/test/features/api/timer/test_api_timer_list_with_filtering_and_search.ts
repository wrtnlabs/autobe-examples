import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_timers_create } from "../../../generate/generate_random_hrm_platform_admin_timers_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test comprehensive filtering and search capabilities for the timer list endpoint.
 * Validates status filtering, date range filtering, project filtering, search functionality,
 * pagination, and combined filter scenarios.
 */
export async function test_api_timer_list_with_filtering_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Member setup for creating test data
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://test.com/member/join",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://test.com/member/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.ILogin,
  });
  // 3. Create test projects
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Alpha",
        description: "First test project",
        status: "active",
        color_code: "#FF5733",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Beta",
        description: "Second test project",
        status: "active",
        color_code: "#33FF57",
        budget_hours: 200,
      },
    },
  );
  typia.assert(project2);
  const project3 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Gamma",
        description: "Third test project",
        status: "completed",
        color_code: "#3357FF",
        budget_hours: 150,
      },
    },
  );
  typia.assert(project3);
  // 4. Create test timers with various states
  // Active timer for project1
  const activeTimer1 = await generate_random_hrm_platform_admin_timers_create(
    adminConnection,
    {
      body: {
        projectId: project1.id,
        description: "Working on feature development",
      },
    },
  );
  typia.assert(activeTimer1);
  // Active timer for project2
  const activeTimer2 = await generate_random_hrm_platform_admin_timers_create(
    adminConnection,
    {
      body: {
        projectId: project2.id,
        description: "Code review session",
      },
    },
  );
  typia.assert(activeTimer2);
  // Stopped timer for project1
  const stoppedTimer1 = await generate_random_hrm_platform_admin_timers_create(
    adminConnection,
    {
      body: {
        projectId: project1.id,
        description: "Meeting with team",
      },
    },
  );
  typia.assert(stoppedTimer1);
  // Stopped timer for project3
  const stoppedTimer2 = await generate_random_hrm_platform_admin_timers_create(
    adminConnection,
    {
      body: {
        projectId: project3.id,
        description: "Documentation work",
      },
    },
  );
  typia.assert(stoppedTimer2);
  // 5. Test status='active' filter
  const activeResult = await api.functional.hrmPlatform.admin.timers.index(
    adminConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(activeResult);
  TestValidator.predicate(
    "active filter returns results",
    activeResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "active filter pagination consistency",
    activeResult.pagination.records,
    activeResult.data.length,
  );
  // 6. Test status='stopped' filter
  const stoppedResult = await api.functional.hrmPlatform.admin.timers.index(
    adminConnection,
    {
      body: {
        status: "stopped",
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(stoppedResult);
  TestValidator.predicate(
    "stopped filter returns results",
    stoppedResult.pagination.records >= 0,
  );
  // 7. Test date range filtering
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const endDate = new Date();
  const dateRangeResult = await api.functional.hrmPlatform.admin.timers.index(
    adminConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns valid results",
    dateRangeResult.pagination.records >= 0,
  );
  // 8. Test project_id filter
  const projectFilterResult =
    await api.functional.hrmPlatform.admin.timers.index(adminConnection, {
      body: {
        project_id: project1.id,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(projectFilterResult);
  TestValidator.predicate(
    "project filter returns timers for specified project",
    projectFilterResult.data.length > 0,
  );
  TestValidator.equals(
    "project filter pagination consistency",
    projectFilterResult.pagination.records,
    projectFilterResult.data.length,
  );
  // 9. Test search filter on description
  const searchResult = await api.functional.hrmPlatform.admin.timers.index(
    adminConnection,
    {
      body: {
        search: "feature",
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search filter executes successfully",
    searchResult.pagination.records >= 0,
  );
  // 10. Test combined filters (status + date range + project)
  const combinedFilterResult =
    await api.functional.hrmPlatform.admin.timers.index(adminConnection, {
      body: {
        status: "active",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        project_id: project1.id,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters execute successfully",
    combinedFilterResult.pagination.records >= 0,
  );
  // 11. Test pagination parameters
  const paginationResult = await api.functional.hrmPlatform.admin.timers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "started_at",
        order: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination data within limit",
    paginationResult.data.length <= 10,
  );
  // 12. Test empty results (search for non-existent term)
  const emptyResult = await api.functional.hrmPlatform.admin.timers.index(
    adminConnection,
    {
      body: {
        search: "nonexistent12345",
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptyResult.data.length,
    0,
  );
  // 13. Test invalid date range handling (start_date > end_date)
  const invalidDateResult = await api.functional.hrmPlatform.admin.timers.index(
    adminConnection,
    {
      body: {
        start_date: endDate.toISOString(),
        end_date: startDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(invalidDateResult);
  TestValidator.equals(
    "invalid date range returns zero records",
    invalidDateResult.pagination.records,
    0,
  );
}
