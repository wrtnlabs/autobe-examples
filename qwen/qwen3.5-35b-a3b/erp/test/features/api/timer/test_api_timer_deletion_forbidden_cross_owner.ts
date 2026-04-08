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
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_timer_deletion_forbidden_cross_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Employee A account and authenticate
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeAAuth = await authorize_member_join(employeeAConnection, {
    body: {
      org_name: "Employee A Organization",
      org_currency: "USD",
    },
  });
  typia.assert(employeeAAuth);
  // 2. Create Employee B account and authenticate
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeBAuth = await authorize_member_join(employeeBConnection, {
    body: {
      org_name: "Employee B Organization",
      org_currency: "USD",
    },
  });
  typia.assert(employeeBAuth);
  // 3. Create a project for Employee A
  const project = await generate_random_hrm_platform_member_projects_create(
    employeeAConnection,
    {
      body: {
        name: "Cross-Owner Test Project",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 4. Create a timer owned by Employee A
  const timer = await generate_random_hrm_platform_member_timers_create(
    employeeAConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
      },
    },
  );
  typia.assert(timer);
  // Verify timer belongs to Employee A
  TestValidator.equals(
    "timer belongs to employee A",
    timer.hrm_platform_employee_id,
    employeeAAuth.member.id,
  );
  TestValidator.equals("timer deleted_at is null", timer.deleted_at, null);
  // 5. Attempt to delete Employee A's timer using Employee B's authentication
  await TestValidator.httpError(
    "employee B cannot delete employee A's timer",
    [403],
    async () => {
      await api.functional.hrmPlatform.member.timers.erase(
        employeeBConnection,
        { timerId: timer.id },
      );
    },
  );
}
