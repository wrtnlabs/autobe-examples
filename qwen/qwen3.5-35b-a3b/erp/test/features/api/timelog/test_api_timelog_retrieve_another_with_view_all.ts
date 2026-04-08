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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_retrieve_another_with_view_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (Employee)
  const orgName = RandomGenerator.name();
  const orgCurrency = RandomGenerator.pick(["USD", "EUR", "KRW"]);
  const join1 = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: orgName,
      org_currency: orgCurrency,
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(join1);
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(employeeConnection, {
    body: {
      email: join1.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmPlatformMember.ILogin,
  });
  // 2. Create project within organization
  const project = await api.functional.hrmPlatform.member.projects.create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create task within project
  const task = await api.functional.hrmPlatform.member.tasks.create(
    employeeConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        project_id: project.id,
        priority: "MEDIUM",
        estimated_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<40>
        >(),
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Create timelog for first employee
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    employeeConnection,
    {
      body: {
        employee_id: join1.member.id,
        project_id: project.id,
        start_datetime: new Date(Date.now() - 7200000).toISOString(),
        end_datetime: new Date(Date.now() - 3600000).toISOString(),
        duration_minutes: 60,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 5. Create second member (Manager) - same organization
  const join2 = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: orgName,
      org_currency: orgCurrency,
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(join2);
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(managerConnection, {
    body: {
      email: join2.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmPlatformMember.ILogin,
  });
  // 6. Retrieve first employee's timelog as second member
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    managerConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 7. Validate timelog details
  TestValidator.equals("timelog ID matches", timelog.id, retrievedTimelog.id);
  TestValidator.equals(
    "employee matches",
    timelog.employee.id,
    retrievedTimelog.employee.id,
  );
  TestValidator.equals(
    "project matches",
    timelog.project.id,
    retrievedTimelog.project.id,
  );
  TestValidator.equals(
    "duration_minutes matches",
    timelog.duration_minutes,
    retrievedTimelog.duration_minutes,
  );
  TestValidator.equals(
    "billable matches",
    timelog.billable,
    retrievedTimelog.billable,
  );
  TestValidator.notEquals(
    "timelog owner different from viewer",
    timelog.employee.id,
    join2.member.id,
  );
  TestValidator.equals(
    "timelog not soft-deleted",
    retrievedTimelog.deleted_at,
    null,
  );
}
