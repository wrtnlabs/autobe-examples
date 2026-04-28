import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test retrieving an active timer by its unique identifier.
 *
 * Authenticates as a new member, creates a project, starts an active timer on that project, and retrieves the timer by its ID. Validates the complete timer structure including tracking state, project reference, employee and member information, and timestamps.
 *
 * Ensures that an active timer correctly reports stopped_at as null (indicating it is still running), deleted_at as null (not discarded), and started_at populated with the creation timestamp. Verifies that the timer references the correct project and that member and employee fields contain the authenticated user's information.
 *
 * 1. Register a new member account, which creates a default organization.
 * 2. Create a project within the organization for time tracking.
 * 3. Start an active timer on the project.
 * 4. Retrieve the timer by its unique identifier.
 * 5. Validate all timer fields and business state.
 */
export async function test_api_timer_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  typia.assert(member);
  // 2. Create a project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      } satisfies DeepPartial<IHrmPlatformProject.ICreate>,
    },
  );
  typia.assert(project);
  // 3. Start an active timer on the project
  const createdTimer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies DeepPartial<IHrmPlatformTimer.ICreate>,
    },
  );
  typia.assert(createdTimer);
  // 4. Retrieve the timer by its unique identifier
  const retrievedTimer: IHrmPlatformTimer =
    await api.functional.hrmPlatform.member.timers.at(memberConnection, {
      timerId: createdTimer.id,
    });
  typia.assert(retrievedTimer);
  // 5. Validate timer fields and business state
  TestValidator.equals("timer id matches", retrievedTimer.id, createdTimer.id);
  TestValidator.equals(
    "project id matches",
    retrievedTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTimer.project.name,
    project.name,
  );
  TestValidator.predicate(
    "started_at is populated",
    retrievedTimer.started_at !== undefined,
  );
  TestValidator.equals(
    "stopped_at is null for active timer",
    retrievedTimer.stopped_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active timer",
    retrievedTimer.deleted_at,
    null,
  );
  TestValidator.equals(
    "member id matches",
    retrievedTimer.member.id,
    member.id,
  );
  TestValidator.equals(
    "employee member id matches",
    retrievedTimer.employee.member.id,
    member.id,
  );
  TestValidator.predicate(
    "created_at is populated",
    retrievedTimer.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is populated",
    retrievedTimer.updated_at !== undefined,
  );
}
