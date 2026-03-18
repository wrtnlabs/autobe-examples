import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_list_own_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization (authenticated member becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // owner.id is the organization member ID of the authenticated member
  const ownerOrgMemberId = organization.owner.id;
  // 3. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Assign the member (owner) to the project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          organizationMemberId: ownerOrgMemberId,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create 3 billable timelogs in week 1 (2024-03-04 to 2024-03-06)
  const week1Dates = [
    "2024-03-04T00:00:00.000Z",
    "2024-03-05T00:00:00.000Z",
    "2024-03-06T00:00:00.000Z",
  ];
  const billableTimelogs = await ArrayUtil.asyncMap(
    week1Dates,
    async (date) => {
      const timelog = await generate_random_erp_hrm_member_timelogs_create(
        memberConnection,
        {
          body: {
            project_id: project.id,
            work_date: date,
            duration_minutes: 60,
            billable: true,
            description: "Billable work session",
          },
        },
      );
      typia.assert(timelog);
      return timelog;
    },
  );
  // 6. Create 2 non-billable timelogs in week 2 (2024-03-11 to 2024-03-12)
  const week2Dates = ["2024-03-11T00:00:00.000Z", "2024-03-12T00:00:00.000Z"];
  const nonBillableTimelogs = await ArrayUtil.asyncMap(
    week2Dates,
    async (date) => {
      const timelog = await generate_random_erp_hrm_member_timelogs_create(
        memberConnection,
        {
          body: {
            project_id: project.id,
            work_date: date,
            duration_minutes: 30,
            billable: false,
            description: "Non-billable work session",
          },
        },
      );
      typia.assert(timelog);
      return timelog;
    },
  );
  const allCreatedIds = [
    ...billableTimelogs.map((t) => t.id),
    ...nonBillableTimelogs.map((t) => t.id),
  ];
  // 7. Test 1: No filters - should return all 5 timelogs (fresh member account)
  const allTimelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(allTimelogs);
  TestValidator.equals(
    "no-filter returns all 5 timelogs",
    allTimelogs.pagination.records,
    5,
  );
  // Verify all 5 created timelogs are in the result
  const returnedIds = allTimelogs.data.map((t) => t.id);
  for (const id of allCreatedIds) {
    TestValidator.predicate(
      "timelog present in no-filter result",
      returnedIds.includes(id),
    );
  }
  // 8. Test 2: Date range filter (week 1 only: 2024-03-04 to 2024-03-08)
  const week1Timelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        startDate: "2024-03-04T00:00:00.000Z",
        endDate: "2024-03-08T23:59:59.000Z",
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(week1Timelogs);
  TestValidator.equals(
    "date range filter returns only 3 week1 timelogs",
    week1Timelogs.pagination.records,
    3,
  );
  // Verify all week1 timelogs are present
  const week1ReturnedIds = week1Timelogs.data.map((t) => t.id);
  for (const timelog of billableTimelogs) {
    TestValidator.predicate(
      "week1 timelog present in date-range result",
      week1ReturnedIds.includes(timelog.id),
    );
  }
  // 9. Test 3: Project filter - all 5 timelogs belong to this project
  const projectFilteredTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        projectId: project.id,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(projectFilteredTimelogs);
  TestValidator.equals(
    "project filter returns 5 timelogs scoped to project",
    projectFilteredTimelogs.pagination.records,
    5,
  );
  for (const timelog of projectFilteredTimelogs.data) {
    TestValidator.equals(
      "timelog belongs to correct project",
      timelog.project.id,
      project.id,
    );
  }
  // 10. Test 4: billable=true filter - should return exactly 3
  const billableOnlyTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(billableOnlyTimelogs);
  TestValidator.equals(
    "billable=true filter returns exactly 3 timelogs",
    billableOnlyTimelogs.pagination.records,
    3,
  );
  for (const timelog of billableOnlyTimelogs.data) {
    TestValidator.predicate("timelog is billable", timelog.billable === true);
  }
  // 11. Test 5: billable=false filter - should return exactly 2
  const nonBillableOnlyTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        billable: false,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(nonBillableOnlyTimelogs);
  TestValidator.equals(
    "billable=false filter returns exactly 2 timelogs",
    nonBillableOnlyTimelogs.pagination.records,
    2,
  );
  for (const timelog of nonBillableOnlyTimelogs.data) {
    TestValidator.predicate(
      "timelog is non-billable",
      timelog.billable === false,
    );
  }
  // 12. Test 6: memberOrganizationMemberId filter - silently ignored for standard member
  const memberFilterTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        memberOrganizationMemberId: ownerOrgMemberId,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(memberFilterTimelogs);
  TestValidator.equals(
    "memberOrganizationMemberId filter: results remain scoped to own timelogs",
    memberFilterTimelogs.pagination.records,
    5,
  );
  // 13. Test 7: Validate pagination metadata with explicit page and limit
  const paginatedTimelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(paginatedTimelogs);
  TestValidator.equals(
    "pagination current page is 1",
    paginatedTimelogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginatedTimelogs.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records is 5",
    paginatedTimelogs.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination total pages is 3 (ceil(5/2))",
    paginatedTimelogs.pagination.pages,
    3,
  );
  TestValidator.predicate(
    "paginated data count <= limit",
    paginatedTimelogs.data.length <= 2,
  );
}
