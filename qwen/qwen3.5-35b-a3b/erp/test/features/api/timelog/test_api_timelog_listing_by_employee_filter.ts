import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_listing_by_employee_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization
  const joinConnection: api.IConnection = { host: connection.host };
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: randomEmail,
      password: randomPassword,
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create project within organization using member connection
  const project = await generate_random_hrm_platform_member_projects_create(
    joinConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
      },
    },
  );
  typia.assert(project);
  // 3. Get employee ID from member's id
  const employeeId = joinResult.member.id;
  // 4. Create timelog entry for the member and project
  const now = new Date();
  const startDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    joinConnection,
    {
      body: {
        employee_id: employeeId,
        project_id: project.id,
        task_id: undefined,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        duration_minutes: 60,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: typia.random<boolean>(),
      },
    },
  );
  typia.assert(timelog);
  // 5. Test filtering timelogs by employee_id
  const response = await api.functional.hrmPlatform.member.timelogs.index(
    joinConnection,
    {
      body: {
        employee_id: employeeId,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(response);
  // 6. Validate filtering results
  TestValidator.equals(
    "pagination records count matches expected",
    response.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages count correct",
    response.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination current page correct",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "timelog count matches expected",
    response.data.length,
    1,
  );
  // 7. Validate timelog entry details
  const resultTimelog = response.data[0];
  TestValidator.equals(
    "timelog employee_id matches filter",
    resultTimelog.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "timelog project_id matches created project",
    resultTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog duration_minutes is correct",
    resultTimelog.duration_minutes,
    60,
  );
  TestValidator.equals(
    "timelog billable matches input",
    resultTimelog.billable,
    timelog.billable,
  );
  TestValidator.equals(
    "timelog description matches input",
    resultTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "timelog start_datetime matches",
    resultTimelog.start_datetime,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "timelog end_datetime matches",
    resultTimelog.end_datetime,
    endDate.toISOString(),
  );
  // 8. Verify task is null when not specified
  TestValidator.predicate(
    "task is null when not specified",
    () => resultTimelog.task === null,
  );
  // 9. Validate employee association details
  TestValidator.equals(
    "employee display_name matches member name",
    resultTimelog.employee.display_name,
    joinResult.member.display_name,
  );
  TestValidator.equals(
    "employee email matches member email",
    resultTimelog.employee.email,
    joinResult.member.email,
  );
  // 10. Validate project association details
  TestValidator.equals(
    "project name matches created project",
    resultTimelog.project.name,
    project.name,
  );
  TestValidator.equals(
    "project color_code matches created project",
    resultTimelog.project.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "project status matches",
    resultTimelog.project.status,
    project.status,
  );
  // 11. Test filtering with non-existent employee_id returns empty results
  const nonExistentEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const emptyResponse = await api.functional.hrmPlatform.member.timelogs.index(
    joinConnection,
    {
      body: {
        employee_id: nonExistentEmployeeId,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty response pagination records count",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty response pagination pages count",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty response data array is empty",
    emptyResponse.data.length,
    0,
  );
}
