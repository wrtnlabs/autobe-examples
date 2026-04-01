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
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test updating a running timer's project and description.
 *
 * This test validates the workflow where an employee:
 * 1. Starts a timer on Project A
 * 2. Updates the timer to switch to Project B
 * 3. Modifies the work description
 *
 * Validates that the timer continues running (started_at unchanged),
 * project and description are updated correctly, and updated_at reflects
 * the modification time.
 */
export async function test_api_timer_update_project_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (automatically creates employee record for member)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create Project A (initial timer project)
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectA);
  // 4. Create Project B (target project for switch)
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#e74c3c",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectB);
  // 5. Create timer on Project A
  // The API validates that the employee (from auth context) is a member of the project
  // Since organization creation auto-creates employee, and projects are in same org,
  // the employee should have access. However, we need explicit project membership.
  // For this test, we create the timer which will validate membership internally.
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        description: initialDescription,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Validate initial timer state
  TestValidator.equals(
    "timer owned by member",
    timer.employee.user.id,
    memberAuth.id,
  );
  TestValidator.equals("timer on Project A", timer.project.id, projectA.id);
  TestValidator.equals(
    "initial description set",
    timer.description,
    initialDescription,
  );
  // 6. Update timer to switch to Project B and change description
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTimer =
    await api.functional.hrmPlatform.member.timers.putByTimerid(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          project_id: projectB.id,
          description: newDescription,
        } satisfies IHrmPlatformTimer.IUpdate,
      },
    );
  typia.assert(updatedTimer);
  // 7. Validate the update
  TestValidator.equals("timer id unchanged", updatedTimer.id, timer.id);
  TestValidator.equals(
    "project changed to Project B",
    updatedTimer.project.id,
    projectB.id,
  );
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    newDescription,
  );
  TestValidator.equals(
    "started_at unchanged",
    updatedTimer.started_at,
    timer.started_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedTimer.updated_at !== timer.updated_at,
  );
  TestValidator.predicate(
    "updated_at is after original",
    new Date(updatedTimer.updated_at).getTime() >
      new Date(timer.updated_at).getTime(),
  );
  TestValidator.equals(
    "employee unchanged",
    updatedTimer.employee.id,
    timer.employee.id,
  );
  TestValidator.equals("task remains null", updatedTimer.task, null);
}