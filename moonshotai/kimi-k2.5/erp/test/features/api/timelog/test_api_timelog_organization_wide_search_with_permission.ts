import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test organization-wide timelog visibility for users with view-all-time permission.
 * This scenario validates that managers or administrators can search and view all employee timelogs
 * within the organization, not just their own. The test creates multiple organization members and
 * timelogs for different employees, then performs a search without employee-specific restrictions.
 * Validate that results include timelogs from all organization members, with correct employee
 * attribution in the response. Test filtering by specific project to show cross-employee timelogs
 * for that project. This validates the permission-based access control logic where view-all-time
 * permission grants organization-wide visibility while standard employees can only see personal timelogs.
 */
export async function test_api_timelog_organization_wide_search_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager with elevated permissions
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(manager);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create first employee (global member)
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1 = await authorize_member_join(employee1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(employee1);
  // 5. Create organization member for employee 1
  const orgMember1 =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee1.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(orgMember1);
  // 6. Create second employee (global member)
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2 = await authorize_member_join(employee2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(employee2);
  // 7. Create organization member for employee 2
  const orgMember2 =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee2.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(orgMember2);
  // 8. Create timelog for employee 1
  const startTime1 = new Date(Date.now() - 7200000).toISOString();
  const endTime1 = new Date(Date.now() - 3600000).toISOString();
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    employee1Connection,
    {
      body: {
        project_id: project.id,
        start_time: startTime1,
        end_time: endTime1,
        billable: true,
        description: "Work performed by employee 1",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  // 9. Create timelog for employee 2
  const startTime2 = new Date(Date.now() - 3600000).toISOString();
  const endTime2 = new Date().toISOString();
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    employee2Connection,
    {
      body: {
        project_id: project.id,
        start_time: startTime2,
        end_time: endTime2,
        billable: false,
        description: "Work performed by employee 2",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // 10. Search timelogs organization-wide (manager with view-all-time permission)
  const searchResult: IPageIErpHrmTimelog.ISummary =
    await api.functional.erpHrm.member.timelogs.index(managerConnection, {
      body: {
        page: 1,
        limit: 10,
        sortBy: "start_time",
        sortDirection: "desc",
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(searchResult);
  // 11. Validate that results include timelogs from both employees
  TestValidator.predicate(
    "search results include timelog from employee 1",
    () => searchResult.data.some((t) => t.id === timelog1.id),
  );
  TestValidator.predicate(
    "search results include timelog from employee 2",
    () => searchResult.data.some((t) => t.id === timelog2.id),
  );
  TestValidator.predicate(
    "search results contain at least 2 timelogs",
    () => searchResult.data.length >= 2,
  );
  // 12. Test filtering by specific project
  const projectFilterResult: IPageIErpHrmTimelog.ISummary =
    await api.functional.erpHrm.member.timelogs.index(managerConnection, {
      body: {
        page: 1,
        limit: 10,
        projectId: project.id,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(projectFilterResult);
  // 13. Validate project filter returns both timelogs for this project
  TestValidator.equals(
    "project filter returns correct number of timelogs",
    projectFilterResult.data.length,
    2,
  );
  TestValidator.predicate(
    "project filter includes timelog from employee 1",
    () => projectFilterResult.data.some((t) => t.id === timelog1.id),
  );
  TestValidator.predicate(
    "project filter includes timelog from employee 2",
    () => projectFilterResult.data.some((t) => t.id === timelog2.id),
  );
  // 14. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination total records",
    () => searchResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination total pages",
    () => searchResult.pagination.pages >= 1,
  );
}
