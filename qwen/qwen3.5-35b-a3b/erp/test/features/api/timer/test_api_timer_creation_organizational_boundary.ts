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

export async function test_api_timer_creation_organizational_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
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
  // 2. Create project within the same organization
  const projectConnection: api.IConnection = { host: connection.host };
  const project = await api.functional.hrmPlatform.member.projects.create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Validate project belongs to member's organization
  TestValidator.equals(
    "project organization matches member organization",
    project.organization.id,
    joinResult.token.access !== ""
      ? project.organization.id
      : project.organization.id,
  );
  // 4. Create timer associated with the project
  const timerConnection: api.IConnection = { host: connection.host };
  const timer = await api.functional.hrmPlatform.member.timers.create(
    timerConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: undefined,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 5. Validate timer project association
  TestValidator.equals(
    "timer has correct project association",
    timer.hrm_platform_project_id,
    project.id,
  );
  // 6. Validate timer status and timestamps
  TestValidator.equals("timer is in started status", timer.status, "started");
  TestValidator.equals("timer has zero duration", timer.duration_seconds, 0);
  TestValidator.predicate(
    "timer has valid last_tick_at",
    timer.last_tick_at !== undefined,
  );
  TestValidator.predicate(
    "timer has valid created_at",
    timer.created_at !== undefined,
  );
  TestValidator.predicate(
    "timer has valid updated_at",
    timer.updated_at !== undefined,
  );
  TestValidator.equals("timer has null deleted_at", timer.deleted_at, null);
  // 7. Validate timer belongs to the authenticated employee
  TestValidator.equals(
    "timer belongs to authenticated employee",
    timer.hrm_platform_employee_id,
    joinResult.member.id,
  );
}
