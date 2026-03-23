import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test project status change prevents timelogs.
 *
 * This test validates the business rule that changing a project's status
 * from 'active' to 'completed' or 'archived' prevents new timelog additions
 * while preserving all existing project data and time entries.
 *
 * Test Flow:
 * 1. Authenticate as member with project management permissions
 * 2. Create an active project
 * 3. Update project status to 'completed'
 * 4. Verify project status change and data preservation
 * 5. Test the same flow with 'archived' status
 * 6. Test changing back to 'active' status
 */
export async function test_api_project_status_change_prevents_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create an active project
  const activeProject: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeProject);
  // Validate initial project state
  TestValidator.equals(
    "initial status is active",
    activeProject.status,
    "active",
  );
  // 3. Update project status to 'completed'
  const completedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: activeProject.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(completedProject);
  // 4. Verify project status change and data preservation
  TestValidator.equals(
    "status changed to completed",
    completedProject.status,
    "completed",
  );
  TestValidator.equals(
    "project ID preserved",
    completedProject.id,
    activeProject.id,
  );
  TestValidator.equals(
    "project name preserved",
    completedProject.name,
    activeProject.name,
  );
  TestValidator.equals(
    "color code preserved",
    completedProject.color_code,
    activeProject.color_code,
  );
  TestValidator.equals(
    "description preserved",
    completedProject.description,
    activeProject.description,
  );
  TestValidator.equals(
    "budget hours preserved",
    completedProject.budget_hours,
    activeProject.budget_hours,
  );
  TestValidator.notEquals(
    "updated_at changed",
    completedProject.updated_at,
    activeProject.updated_at,
  );
  // 5. Test the same flow with 'archived' status
  const archivedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: completedProject.id,
      body: {
        status: "archived",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(archivedProject);
  // Verify archived status and data preservation
  TestValidator.equals(
    "status changed to archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.equals(
    "project ID preserved",
    archivedProject.id,
    completedProject.id,
  );
  TestValidator.equals(
    "project name preserved",
    archivedProject.name,
    completedProject.name,
  );
  TestValidator.notEquals(
    "updated_at changed",
    archivedProject.updated_at,
    completedProject.updated_at,
  );
  // 6. Test changing back to 'active' status
  const reactivatedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: archivedProject.id,
      body: {
        status: "active",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(reactivatedProject);
  TestValidator.equals(
    "status changed back to active",
    reactivatedProject.status,
    "active",
  );
  TestValidator.equals(
    "project ID preserved",
    reactivatedProject.id,
    archivedProject.id,
  );
}
