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
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test updating a timer's project assignment with proper membership validation.
 *
 * This test verifies that:
 * 1. Timer project updates fail when employee lacks membership to target project
 * 2. Timer project updates succeed when employee has proper membership
 * 3. Timer metadata (started_at, stopped_at) is preserved during updates
 */
export async function test_api_timer_update_project_assignment_with_membership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first project
  const project1: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Project Alpha",
          status: "active",
          color_code: "#3B82F6",
        },
      },
    );
  typia.assert(project1);
  // 3. Create second project
  const project2: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Project Beta",
          status: "active",
          color_code: "#10B981",
        },
      },
    );
  typia.assert(project2);
  // 4. Assign employee to first project only (generation function handles employee_id)
  const membership1: IHrmPlatformProjectMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project1.id,
        },
        body: {
          role: "member",
        },
      },
    );
  typia.assert(membership1);
  // 5. Create timer on first project
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {
      body: {
        projectId: project1.id,
        description: "Working on project alpha",
      },
    });
  typia.assert(timer);
  // Store original timer values for validation
  const originalStartedAt: string = timer.started_at;
  const originalStoppedAt: (string & tags.Format<"date-time">) | null =
    timer.stopped_at;
  // 6. Negative test: Try to update timer to second project (no membership)
  await TestValidator.error(
    "timer update fails without project membership",
    async () => {
      await api.functional.hrmPlatform.member.timers.update(memberConnection, {
        timerId: timer.id,
        body: {
          project_id: project2.id,
        } satisfies IHrmPlatformTimer.IUpdate,
      });
    },
  );
  // 7. Assign employee to second project
  const membership2: IHrmPlatformProjectMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project2.id,
        },
        body: {
          role: "member",
        },
      },
    );
  typia.assert(membership2);
  // 8. Positive test: Update timer to second project (with membership)
  const updatedTimer: IHrmPlatformTimer =
    await api.functional.hrmPlatform.member.timers.update(memberConnection, {
      timerId: timer.id,
      body: {
        project_id: project2.id,
      } satisfies IHrmPlatformTimer.IUpdate,
    });
  typia.assert(updatedTimer);
  // 9. Validate timer is assigned to second project
  TestValidator.equals(
    "timer project updated",
    updatedTimer.project.id,
    project2.id,
  );
  // 10. Validate started_at remains unchanged
  TestValidator.equals(
    "timer started_at preserved",
    updatedTimer.started_at,
    originalStartedAt,
  );
  // 11. Validate stopped_at is still null (timer still running)
  TestValidator.equals(
    "timer stopped_at is null",
    updatedTimer.stopped_at,
    originalStoppedAt,
  );
}
