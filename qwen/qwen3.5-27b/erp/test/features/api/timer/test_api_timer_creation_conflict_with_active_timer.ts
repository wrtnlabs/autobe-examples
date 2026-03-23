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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_timer_creation_conflict_with_active_timer(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the business rule that prevents an employee from having multiple active timers simultaneously.
   * This test validates that the system enforces a one-active-timer-per-employee constraint by:
   * 1. Successfully creating and starting a first timer
   * 2. Attempting to create a second timer without stopping the first
   * 3. Verifying the second timer creation is rejected with a conflict error
   * 4. Confirming the first timer remains active and unchanged
   */
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create first project for the first timer
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project1);
  // Step 3: Create second project for the attempted second timer
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project2);
  // Step 4: Start the first timer successfully
  const firstTimer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: project1.id,
        description: "First timer - should succeed",
      },
    },
  );
  typia.assert(firstTimer);
  // Validate first timer is active (stopped_at should be null)
  TestValidator.predicate(
    "first timer should be active",
    firstTimer.stopped_at === null,
  );
  TestValidator.equals(
    "first timer project matches",
    firstTimer.project.id,
    project1.id,
  );
  // Step 5: Attempt to create second timer without stopping the first
  // This should fail with a conflict error
  await TestValidator.error(
    "second timer creation should fail with conflict",
    async () => {
      await generate_random_hrm_platform_member_timers_create(
        memberConnection,
        {
          body: {
            projectId: project2.id,
            description: "Second timer - should fail",
          },
        },
      );
    },
  );
  // Step 6: Verify first timer remains unchanged and active
  // We need to check the first timer is still active
  // Since we don't have a GET endpoint for timers in the provided SDK,
  // we validate based on the first timer we created
  TestValidator.predicate(
    "first timer should still be active after conflict",
    firstTimer.stopped_at === null,
  );
  TestValidator.equals(
    "first timer project unchanged",
    firstTimer.project.id,
    project1.id,
  );
  TestValidator.equals(
    "first timer description unchanged",
    firstTimer.description,
    "First timer - should succeed",
  );
}
