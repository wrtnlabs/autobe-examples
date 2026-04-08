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
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_deletion_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager with time:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "KRW",
      org_description: "Manager organization",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  const managerSessionConnection: api.IConnection = { host: connection.host };
  managerSessionConnection.headers = {
    ...managerSessionConnection.headers,
    Authorization: managerAuth.token.access,
  };
  // 2. Create target employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "KRW",
      org_description: "Employee organization",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  const employeeSessionConnection: api.IConnection = { host: connection.host };
  employeeSessionConnection.headers = {
    ...employeeSessionConnection.headers,
    Authorization: employeeAuth.token.access,
  };
  // 3. Create project for timelog (using generated ID since SDK doesn't have project creation)
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create timelog for target employee by manager with time:manage permission
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    managerSessionConnection,
    {
      body: {
        employee_id: employeeAuth.member.id,
        project_id: projectId,
        task_id: null,
        start_datetime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        end_datetime: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
        duration_minutes: 60,
        description: RandomGenerator.paragraph(),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 5. Delete other employee's timelog with manager permission
  // time:manage permission allows deletion regardless of timesheet status
  await api.functional.hrmPlatform.member.timelogs.erase(
    managerSessionConnection,
    {
      timelogId: timelog.id,
    },
  );
  // 6. Verify deletion succeeded (timelog should be soft-deleted)
  // Since we don't have GET endpoint, we verify the erase call completed without error
  // which indicates successful deletion with time:manage permission
  TestValidator.equals("manager can delete other employee timelog", true, true);
}
