import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test retrieving a currently running timer session.
 * 1. Authenticate as member
 * 2. Create an active timer session
 * 3. Retrieve the running timer
 * 4. Validate response structure and active status
 */
export async function test_api_timer_view_running_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an active timer session
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {},
  );
  typia.assert(timer);
  // 3. Retrieve the running timer
  const retrievedTimer = await api.functional.hrmPlatform.member.timers.at(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(retrievedTimer);
  // 4. Validate timer is running (stopped_at is null)
  TestValidator.equals(
    "timer is active (stopped_at is null)",
    retrievedTimer.stopped_at,
    null,
  );
  // 5. Validate timer ID matches the created timer
  TestValidator.equals(
    "timer ID matches created timer",
    retrievedTimer.id,
    timer.id,
  );
  // 6. Validate employee information is populated
  TestValidator.equals(
    "employee ID is present",
    typeof retrievedTimer.employee.id,
    "string",
  );
  TestValidator.equals(
    "employee member email is present",
    typeof retrievedTimer.employee.member.email,
    "string",
  );
  // 7. Validate project information is populated
  TestValidator.equals(
    "project ID is present",
    typeof retrievedTimer.project.id,
    "string",
  );
  TestValidator.equals(
    "project name is present",
    typeof retrievedTimer.project.name,
    "string",
  );
  TestValidator.equals(
    "project status is present",
    typeof retrievedTimer.project.status,
    "string",
  );
  // 8. Validate task can be null or present
  if (retrievedTimer.task !== null) {
    TestValidator.equals(
      "task ID is present when task exists",
      typeof retrievedTimer.task.id,
      "string",
    );
    TestValidator.equals(
      "task title is present when task exists",
      typeof retrievedTimer.task.title,
      "string",
    );
  }
  // 9. Validate description can be null or string
  TestValidator.predicate(
    "description is null or string",
    retrievedTimer.description === null ||
      typeof retrievedTimer.description === "string",
  );
  // 10. Validate timestamps exist
  TestValidator.predicate(
    "started_at timestamp exists",
    retrievedTimer.started_at !== null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedTimer.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedTimer.updated_at !== null,
  );
}
