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
 * Test that an admin can retrieve details of an active (running) timer session.
 *
 * Setup:
 * 1. Authenticate as admin using POST /hrmPlatform/auth/admin/join
 * 2. Create a new timer session with project assignment (no task)
 * 3. Record the timer ID from the response
 *
 * Test Execution:
 * 1. Call GET /hrmPlatform/admin/timers/{timerId} with the recorded timer ID
 * 2. Verify the response contains IHrmPlatformTimer with all required fields
 * 3. Validate timer is still running (stopped_at is null)
 */
export async function test_api_timer_retrieve_running_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a running timer session
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_admin_timers_create(adminConnection, {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(timer);
  // 3. Retrieve the timer by ID
  const retrievedTimer: IHrmPlatformTimer =
    await api.functional.hrmPlatform.admin.timers.at(adminConnection, {
      timerId: timer.id,
    });
  typia.assert(retrievedTimer);
  // 4. Validate timer details
  TestValidator.equals("timer ID matches", retrievedTimer.id, timer.id);
  TestValidator.equals("timer is running", retrievedTimer.stopped_at, null);
  TestValidator.predicate(
    "has employee info",
    retrievedTimer.employee !== null,
  );
  TestValidator.predicate("has project info", retrievedTimer.project !== null);
  TestValidator.equals("task is null", retrievedTimer.task, null);
  TestValidator.equals(
    "description matches",
    retrievedTimer.description,
    timer.description,
  );
}
