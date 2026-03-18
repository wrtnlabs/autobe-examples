import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_list_filter_by_project_and_billable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 3. Create two projects for timelog filtering test
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project Alpha - ${RandomGenerator.alphabets(5)}`,
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project Beta - ${RandomGenerator.alphabets(5)}`,
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(project2);
  // 4. Assign employee to both projects as project member
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      },
    },
  );
  // 5. Create timelog entries with different billable statuses across projects
  // Project 1: 2 billable, 1 non-billable
  const project1Billable1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project1.id,
          date: new Date().toISOString(),
          duration_minutes: 60,
          billable: true,
          description: "Project 1 Billable Work 1",
        },
      },
    );
  typia.assert(project1Billable1);
  const project1Billable2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project1.id,
          date: new Date().toISOString(),
          duration_minutes: 90,
          billable: true,
          description: "Project 1 Billable Work 2",
        },
      },
    );
  typia.assert(project1Billable2);
  const project1NonBillable =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project1.id,
          date: new Date().toISOString(),
          duration_minutes: 45,
          billable: false,
          description: "Project 1 Non-Billable Work",
        },
      },
    );
  typia.assert(project1NonBillable);
  // Project 2: 1 billable, 2 non-billable
  const project2Billable =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project2.id,
          date: new Date().toISOString(),
          duration_minutes: 120,
          billable: true,
          description: "Project 2 Billable Work",
        },
      },
    );
  typia.assert(project2Billable);
  const project2NonBillable1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project2.id,
          date: new Date().toISOString(),
          duration_minutes: 30,
          billable: false,
          description: "Project 2 Non-Billable Work 1",
        },
      },
    );
  typia.assert(project2NonBillable1);
  const project2NonBillable2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project2.id,
          date: new Date().toISOString(),
          duration_minutes: 75,
          billable: false,
          description: "Project 2 Non-Billable Work 2",
        },
      },
    );
  typia.assert(project2NonBillable2);
  // 6. Test filtering by projectId (Project 1)
  const project1Timelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        projectId: project1.id,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(project1Timelogs);
  TestValidator.equals(
    "Project 1 filter returns only Project 1 timelogs",
    project1Timelogs.data.every((t) => t.project.id === project1.id),
    true,
  );
  TestValidator.equals(
    "Project 1 filter count",
    project1Timelogs.pagination.records,
    3,
  );
  // 7. Test filtering by projectId (Project 2)
  const project2Timelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        projectId: project2.id,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(project2Timelogs);
  TestValidator.equals(
    "Project 2 filter returns only Project 2 timelogs",
    project2Timelogs.data.every((t) => t.project.id === project2.id),
    true,
  );
  TestValidator.equals(
    "Project 2 filter count",
    project2Timelogs.pagination.records,
    3,
  );
  // 8. Test filtering by billable=true
  const billableTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(billableTimelogs);
  TestValidator.equals(
    "Billable filter returns only billable timelogs",
    billableTimelogs.data.every((t) => t.billable === true),
    true,
  );
  TestValidator.equals(
    "Billable filter count",
    billableTimelogs.pagination.records,
    3,
  );
  // 9. Test filtering by billable=false
  const nonBillableTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: false,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(nonBillableTimelogs);
  TestValidator.equals(
    "Non-billable filter returns only non-billable timelogs",
    nonBillableTimelogs.data.every((t) => t.billable === false),
    true,
  );
  TestValidator.equals(
    "Non-billable filter count",
    nonBillableTimelogs.pagination.records,
    3,
  );
  // 10. Test combined filter: Project 1 + billable=true
  const project1BillableTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        projectId: project1.id,
        billable: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(project1BillableTimelogs);
  TestValidator.equals(
    "Project 1 + billable filter returns correct timelogs",
    project1BillableTimelogs.data.every(
      (t) => t.project.id === project1.id && t.billable === true,
    ),
    true,
  );
  TestValidator.equals(
    "Project 1 + billable filter count",
    project1BillableTimelogs.pagination.records,
    2,
  );
  // 11. Test combined filter: Project 2 + billable=false
  const project2NonBillableTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        projectId: project2.id,
        billable: false,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(project2NonBillableTimelogs);
  TestValidator.equals(
    "Project 2 + non-billable filter returns correct timelogs",
    project2NonBillableTimelogs.data.every(
      (t) => t.project.id === project2.id && t.billable === false,
    ),
    true,
  );
  TestValidator.equals(
    "Project 2 + non-billable filter count",
    project2NonBillableTimelogs.pagination.records,
    2,
  );
  // 12. Verify pagination metadata
  TestValidator.predicate(
    "Pagination current page is 1",
    project1Timelogs.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination limit is 10",
    project1Timelogs.pagination.limit === 10,
  );
  TestValidator.predicate(
    "Pagination pages calculated correctly",
    project1Timelogs.pagination.pages === 1,
  );
  // 13. Verify task relation (should be null for timelogs without task)
  TestValidator.equals(
    "Timelog without task has null task relation",
    project1Billable1.task,
    null,
  );
  TestValidator.equals(
    "Timelog without task has null task relation",
    project2Billable.task,
    null,
  );
}
