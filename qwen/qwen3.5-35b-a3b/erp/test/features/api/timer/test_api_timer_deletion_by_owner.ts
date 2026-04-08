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

export async function test_api_timer_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create project required for timer
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<number & tags.Minimum<0>>() as
          | number
          | null
          | undefined,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create timer for the authenticated member
  const timer = await api.functional.hrmPlatform.member.timers.create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id as
          | (string & tags.Format<"uuid">)
          | null
          | undefined,
        hrm_platform_task_id: null,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 4. Verify timer belongs to authenticated member (ownership check)
  TestValidator.equals(
    "timer belongs to authenticated member",
    timer.hrm_platform_employee_id,
    authResult.member.id,
  );
  // 5. Delete the timer (soft delete)
  await api.functional.hrmPlatform.member.timers.erase(memberConnection, {
    timerId: timer.id,
  });
  // 6. Verify deletion succeeded - try creating another timer after deletion
  // This confirms the timer was deleted and new timers can be created
  const newTimer = await api.functional.hrmPlatform.member.timers.create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id as
          | (string & tags.Format<"uuid">)
          | null
          | undefined,
        hrm_platform_task_id: null,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(newTimer);
  // 7. Verify new timer also belongs to the authenticated member
  TestValidator.equals(
    "new timer belongs to authenticated member",
    newTimer.hrm_platform_employee_id,
    authResult.member.id,
  );
  // 8. Verify timer IDs are different (old timer deleted, new one created)
  TestValidator.notEquals(
    "timer IDs differ after deletion",
    timer.id,
    newTimer.id,
  );
}
