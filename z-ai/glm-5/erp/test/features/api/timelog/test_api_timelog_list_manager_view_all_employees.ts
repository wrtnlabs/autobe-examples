import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_list_manager_view_all_employees(
  connection: api.IConnection,
): Promise<void> {
  // Create member who will be the organization owner (has all permissions including time:view_all)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: `Manager_${RandomGenerator.alphabets(6)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  // Create projects for timelog entries
  const project1 = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    { body: {} },
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    { body: {} },
  );
  typia.assert(project2);
  // Create multiple timelogs for the manager
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project2.id,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: false,
      },
    },
  );
  typia.assert(timelog3);
  const timelog4 = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project2.id,
        date: new Date().toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog4);
  // Test 1: Request timelog list without filters - manager should see all their timelogs
  const allTimelogsResponse = await api.functional.erpHrm.member.timelogs.index(
    managerConnection,
    {
      body: {} satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(allTimelogsResponse);
  TestValidator.predicate(
    "manager can view timelogs list",
    allTimelogsResponse.data.length >= 4,
  );
  // Test 2: Validate timelog structure contains employee summary
  TestValidator.predicate(
    "timelogs have employee summary",
    allTimelogsResponse.data.every(
      (t) => t.employee !== null && t.employee.member !== null,
    ),
  );
  TestValidator.predicate(
    "timelogs have project info",
    allTimelogsResponse.data.every((t) => t.project !== null),
  );
  // Test 3: Filter by employeeId - manager (owner) has time:view_all permission
  const employeeId = allTimelogsResponse.data[0].employee.id;
  const employeeFilteredResponse =
    await api.functional.erpHrm.member.timelogs.index(managerConnection, {
      body: {
        employeeId: employeeId,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(employeeFilteredResponse);
  TestValidator.predicate(
    "employeeId filter returns matching timelogs",
    employeeFilteredResponse.data.every((t) => t.employee.id === employeeId),
  );
  // Test 4: Filter by projectId
  const projectFilteredResponse =
    await api.functional.erpHrm.member.timelogs.index(managerConnection, {
      body: {
        projectId: project1.id,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(projectFilteredResponse);
  TestValidator.predicate(
    "projectId filter returns matching timelogs",
    projectFilteredResponse.data.every((t) => t.project.id === project1.id),
  );
  // Test 5: Filter by billable status
  const billableFilteredResponse =
    await api.functional.erpHrm.member.timelogs.index(managerConnection, {
      body: {
        billable: true,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(billableFilteredResponse);
  TestValidator.predicate(
    "billable filter returns only billable timelogs",
    billableFilteredResponse.data.every((t) => t.billable === true),
  );
  // Test 6: Filter by date range
  const fromDate = new Date(
    Date.now() - 2.5 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResponse = await api.functional.erpHrm.member.timelogs.index(
    managerConnection,
    {
      body: {
        from: fromDate,
        to: toDate,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter returns timelogs within range",
    dateRangeResponse.data.every((t) => {
      const logDate = new Date(t.date).getTime();
      return (
        logDate >= new Date(fromDate).getTime() &&
        logDate <= new Date(toDate).getTime()
      );
    }),
  );
  // Test 7: Test pagination
  const paginatedResponse = await api.functional.erpHrm.member.timelogs.index(
    managerConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResponse.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination records count matches",
    paginatedResponse.pagination.records >= paginatedResponse.data.length,
  );
  // Test 8: Combined filters - projectId and billable
  const combinedFilterResponse =
    await api.functional.erpHrm.member.timelogs.index(managerConnection, {
      body: {
        projectId: project2.id,
        billable: false,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate(
    "combined filter returns matching timelogs",
    combinedFilterResponse.data.every(
      (t) => t.project.id === project2.id && t.billable === false,
    ),
  );
}
