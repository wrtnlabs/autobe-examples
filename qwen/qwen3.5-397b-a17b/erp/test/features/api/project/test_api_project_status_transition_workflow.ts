import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
 * Test project status transition workflow from active to archived to completed.
 * 1. Authenticate as member
 * 2. Create project with active status
 * 3. Transition from active to archived, verify status and updated_at
 * 4. Transition from archived to completed, verify status
 * 5. Validate all project attributes are preserved throughout transitions
 */
export async function test_api_project_status_transition_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        avatar_image: typia.random<string & tags.Format<"uri">>(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create project with active status
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          status: "active",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(project);
  // Verify initial project state
  TestValidator.equals("initial status is active", project.status, "active");
  const originalName = project.name;
  const originalDescription = project.description;
  const originalColorCode = project.color_code;
  const originalBudgetHours = project.budget_hours;
  const originalCreatedAt = project.created_at;
  const firstUpdatedAt = project.updated_at;
  // 3. Transition from active to archived
  const archivedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(archivedProject);
  // Verify archived status and updated_at refresh
  TestValidator.equals(
    "status is archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.notEquals(
    "updated_at refreshed after archiving",
    archivedProject.updated_at,
    firstUpdatedAt,
  );
  // Verify attributes preserved after archiving
  TestValidator.equals(
    "name preserved after archiving",
    archivedProject.name,
    originalName,
  );
  TestValidator.equals(
    "description preserved after archiving",
    archivedProject.description,
    originalDescription,
  );
  TestValidator.equals(
    "color_code preserved after archiving",
    archivedProject.color_code,
    originalColorCode,
  );
  TestValidator.equals(
    "budget_hours preserved after archiving",
    archivedProject.budget_hours,
    originalBudgetHours,
  );
  TestValidator.equals(
    "created_at preserved after archiving",
    archivedProject.created_at,
    originalCreatedAt,
  );
  // 4. Transition from archived to completed
  const completedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(completedProject);
  // Verify completed status and updated_at refresh
  TestValidator.equals(
    "status is completed",
    completedProject.status,
    "completed",
  );
  TestValidator.notEquals(
    "updated_at refreshed after completion",
    completedProject.updated_at,
    archivedProject.updated_at,
  );
  // Verify attributes preserved after completion
  TestValidator.equals(
    "name preserved after completion",
    completedProject.name,
    originalName,
  );
  TestValidator.equals(
    "description preserved after completion",
    completedProject.description,
    originalDescription,
  );
  TestValidator.equals(
    "color_code preserved after completion",
    completedProject.color_code,
    originalColorCode,
  );
  TestValidator.equals(
    "budget_hours preserved after completion",
    completedProject.budget_hours,
    originalBudgetHours,
  );
  TestValidator.equals(
    "created_at preserved after completion",
    completedProject.created_at,
    originalCreatedAt,
  );
}
