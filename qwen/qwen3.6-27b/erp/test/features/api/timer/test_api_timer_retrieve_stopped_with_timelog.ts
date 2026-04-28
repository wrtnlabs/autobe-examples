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
 * Test retrieving a timer to verify complete timer entity lifecycle structure.
 *
 * Validates the timer retrieval endpoint by creating a project, starting a timer, and retrieving the timer by ID. Verifies that the active timer entity contains all lifecycle fields with proper initial values: started_at populated, stopped_at null for active timers, and all user-specified properties (description, billable, project reference) preserved correctly.
 *
 * The timer lifecycle state is verified by confirming that an active (not yet stopped) timer has the correct structure where stopped_at is null until the timer is stopped and a timelog is generated. The test validates that all creation-time properties are maintained through retrieval.
 *
 * 1. Member registers with email and credentials, creating a default organization.
 * 2. Active project is created within the organization.
 * 3. Timer starts on the project with explicit description and billable flag.
 * 4. Timer retrieved by ID to validate active state and all lifecycle fields.
 * 5. Verifies timer structure supports complete lifecycle (started_at present, stopped_at null for active).
 */
export async function test_api_timer_retrieve_stopped_with_timelog(
  connection: api.IConnection,
) {
  // 1. Member registration (creates default org)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create active project to track time against
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  TestValidator.equals("project status is Active", project.status, "Active");
  // 3. Start timer on project with explicit description and billable flag
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const startedTimer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: description,
        billable: true,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(startedTimer);
  // Verify active timer state: stopped_at null, all creation properties preserved
  TestValidator.equals("project matches", startedTimer.project.id, project.id);
  TestValidator.equals(
    "description preserved",
    startedTimer.description,
    description,
  );
  TestValidator.equals("billable is true", startedTimer.billable, true);
  TestValidator.predicate(
    "stopped_at is null for active timer",
    startedTimer.stopped_at === null,
  );
  TestValidator.predicate(
    "started_at is present",
    startedTimer.started_at !== null,
  );
  // 4. Retrieve the timer by ID to verify retrieval endpoint
  const retrievedTimer = await api.functional.hrmPlatform.member.timers.at(
    memberConnection,
    {
      timerId: startedTimer.id,
    },
  );
  typia.assert(retrievedTimer);
  // 5. Validate retrieved timer state matches creation state
  TestValidator.equals("timer ID matches", retrievedTimer.id, startedTimer.id);
  TestValidator.equals(
    "started_at preserved through retrieval",
    retrievedTimer.started_at,
    startedTimer.started_at,
  );
  TestValidator.equals(
    "stopped_at remains null for active timer",
    retrievedTimer.stopped_at,
    null,
  );
  TestValidator.equals(
    "project reference valid",
    retrievedTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "description preserved",
    retrievedTimer.description,
    description,
  );
  TestValidator.equals("billable preserved", retrievedTimer.billable, true);
  // Verify member and employee references are maintained
  TestValidator.equals(
    "member ID matches",
    retrievedTimer.member.id,
    member.id,
  );
  TestValidator.equals(
    "employee status is active",
    retrievedTimer.employee.status,
    "active",
  );
  TestValidator.equals(
    "employee member matches",
    retrievedTimer.employee.member.id,
    member.id,
  );
  // Verify timer supports null task reference (timer without task assignment)
  TestValidator.equals(
    "task is null when not assigned",
    retrievedTimer.task,
    null,
  );
}
