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
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_timers_create } from "../../../generate/generate_random_hrm_platform_admin_timers_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test that timer creation is rejected when an employee already has an active timer.
 *
 * This test validates the business rule that prevents an employee from having
 * multiple active timers simultaneously. The system must enforce that each
 * employee can only have one running timer at any given time.
 */
export async function test_api_timer_creation_rejected_with_existing_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create first project
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Alpha",
        status: "active",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  // 3. Create second project
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Beta",
        status: "active",
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(project2);
  // 4. Assign member to first project
  const membership1 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project1.id,
        },
        body: {
          employee_id: memberAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(membership1);
  // 5. Assign member to second project
  const membership2 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project2.id,
        },
        body: {
          employee_id: memberAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(membership2);
  // 6. Create first active timer on project1
  const firstTimer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: project1.id,
        description: "First active timer",
      },
    },
  );
  typia.assert(firstTimer);
  // 7. Verify first timer is active (stopped_at should be null)
  TestValidator.predicate(
    "first timer should be active",
    firstTimer.stopped_at === null,
  );
  // 8. Attempt to create second timer on project2 - should be rejected
  await TestValidator.error(
    "second timer creation should be rejected due to existing active timer",
    async () => {
      await generate_random_hrm_platform_admin_timers_create(memberConnection, {
        body: {
          projectId: project2.id,
          description: "Second timer that should fail",
        },
      });
    },
  );
}
