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

export async function test_api_timelog_list_employee_own_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: `test_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection for subsequent API calls
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Create employee record for the authenticated member
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
  // 4. Create projects to assign timelogs against
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#e74c3c",
      },
    },
  );
  typia.assert(project2);
  // 5. Assign employee to projects as project member
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
  // 6. Create multiple timelog entries for different dates and projects
  const timelogCount = 5;
  const timelogs: IHrmPlatformTimelog[] = [];
  for (let i = 0; i < timelogCount; i++) {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: i % 2 === 0 ? project1.id : project2.id,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: i % 2 === 0,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // 7. Call the timelog list endpoint to retrieve all own timelogs
  const response = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(response);
  // 8. Validate pagination metadata
  TestValidator.predicate("has pagination", response.pagination !== undefined);
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "records count matches timelogs created",
    response.pagination.records >= timelogCount,
  );
  // 9. Validate timelog data structure
  TestValidator.predicate("has data array", Array.isArray(response.data));
  TestValidator.predicate("data contains timelogs", response.data.length > 0);
  // 10. Verify each timelog has required relations and fields
  for (const timelog of response.data) {
    TestValidator.predicate(
      "timelog has employee",
      timelog.employee !== undefined,
    );
    TestValidator.predicate(
      "timelog employee has id",
      timelog.employee.id !== undefined,
    );
    TestValidator.predicate(
      "timelog employee has display_name",
      timelog.employee.display_name !== undefined,
    );
    TestValidator.predicate(
      "timelog has project",
      timelog.project !== undefined,
    );
    TestValidator.predicate(
      "timelog project has id",
      timelog.project.id !== undefined,
    );
    TestValidator.predicate(
      "timelog project has name",
      timelog.project.name !== undefined,
    );
    TestValidator.predicate("timelog has id", timelog.id !== undefined);
    TestValidator.predicate("timelog has date", timelog.date !== undefined);
    TestValidator.predicate(
      "timelog has duration",
      timelog.duration_minutes >= 1,
    );
    TestValidator.predicate(
      "timelog has billable flag",
      typeof timelog.billable === "boolean",
    );
  }
  // 11. Verify sorting (date descending)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentDate = new Date(response.data[i].date).getTime();
      const nextDate = new Date(response.data[i + 1].date).getTime();
      TestValidator.predicate(
        `timelogs sorted by date desc (index ${i})`,
        currentDate >= nextDate,
      );
    }
  }
  // 12. Verify all returned timelogs belong to the current employee
  for (const timelog of response.data) {
    TestValidator.equals(
      "timelog employee matches current employee",
      timelog.employee.id,
      employee.id,
    );
  }
  // 13. Verify timelogs are from the projects we created
  const projectIds = [project1.id, project2.id];
  for (const timelog of response.data) {
    TestValidator.predicate(
      "timelog project is one of created projects",
      projectIds.includes(timelog.project.id),
    );
  }
}