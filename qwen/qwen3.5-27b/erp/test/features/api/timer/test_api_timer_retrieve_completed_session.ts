import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_timers_create } from "../../../generate/generate_random_hrm_platform_admin_timers_create";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test that an admin can retrieve details of a timer session.
 *
 * This test validates the timer retrieval endpoint by:
 * 1. Authenticating as admin
 * 2. Creating a timer session
 * 3. Retrieving the timer details
 * 4. Validating all required fields are present and properly structured
 */
export async function test_api_timer_retrieve_completed_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a timer session
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_admin_timers_create(adminConnection, {
      body: undefined,
    });
  typia.assert(timer);
  // 3. Retrieve the timer details
  const retrievedTimer: IHrmPlatformTimer =
    await api.functional.hrmPlatform.admin.timers.at(adminConnection, {
      timerId: timer.id,
    });
  typia.assert(retrievedTimer);
  // 4. Validate timer ID matches
  TestValidator.equals("timer ID matches", retrievedTimer.id, timer.id);
  // 5. Validate employee information is present and has valid email (via member)
  TestValidator.equals(
    "employee member email exists",
    retrievedTimer.employee.member.email.length > 0,
    true,
  );
  // 6. Validate project information is present and has valid name
  TestValidator.equals(
    "project name exists",
    retrievedTimer.project.name.length > 0,
    true,
  );
  // 7. Validate started_at timestamp is reasonable (not future)
  TestValidator.predicate(
    "started_at is not in future",
    new Date(retrievedTimer.started_at).getTime() <= Date.now(),
  );
  // 8. Validate stopped_at is either null (running) or has value (completed)
  TestValidator.predicate(
    "stopped_at is null or has valid value",
    retrievedTimer.stopped_at === null || retrievedTimer.stopped_at.length > 0,
  );
  // 9. Validate deleted_at is null (timer is not deleted)
  TestValidator.equals("timer is not deleted", retrievedTimer.deleted_at, null);
  // 10. Validate task is either null or has valid ID
  TestValidator.predicate(
    "task is null or has valid ID",
    retrievedTimer.task === null || retrievedTimer.task.id.length > 0,
  );
  // 11. Validate description can be null or string
  TestValidator.predicate(
    "description is null or string",
    retrievedTimer.description === null ||
      typeof retrievedTimer.description === "string",
  );
}
