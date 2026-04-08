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

/**
 * Test that an employee cannot access another employee's timer record.
 *
 * Validates the ownership enforcement for timer records in the HRM platform.
 * Ensures that employees can only access their own timers and receive a
 * 403 Forbidden error when attempting to access another employee's timer.
 *
 * 1. Member A account creation and authentication
 * 2. Member B account creation and authentication
 * 3. Member A creates a project within their organization
 * 4. Member A creates a timer associated with the project
 * 5. Verify timer ownership matches member A's employee ID
 * 6. Member B attempts to retrieve member A's timer - expects 403 Forbidden
 */
export async function test_api_timer_retrieve_another_employees_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A account and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
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
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // Create new connection with member A's token for API calls
  const memberAActorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAAuth.token.access,
    },
  };
  // 2. Create member B account and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
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
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Create new connection with member B's token for API calls
  const memberBActorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberBAuth.token.access,
    },
  };
  // 3. Member A creates a project within their organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberAActorConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >() satisfies number,
        start_date: (RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24 * 30,
        )?.toISOString() ?? null) satisfies
          | (string & tags.Format<"date-time">)
          | null
          | undefined,
        end_date: (RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24 * 180,
        )?.toISOString() ?? null) satisfies
          | (string & tags.Format<"date-time">)
          | null
          | undefined,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Member A creates a timer associated with the project
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberAActorConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: undefined,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 5. Verify timer was created and belongs to member A
  const memberASummary = memberAAuth.member;
  TestValidator.equals(
    "timer belongs to member A",
    timer.hrm_platform_employee_id,
    memberASummary.id,
  );
  TestValidator.equals(
    "timer project matches",
    timer.hrm_platform_project_id,
    project.id,
  );
  // 6. Member B attempts to retrieve member A's timer - expect 403 Forbidden
  await TestValidator.httpError(
    "member B cannot access member A's timer",
    403,
    async () => {
      await api.functional.hrmPlatform.member.timers.at(
        memberBActorConnection,
        {
          timerId: timer.id,
        },
      );
    },
  );
}
