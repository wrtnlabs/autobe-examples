import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test project status transitions through valid lifecycle states.
 *
 * This test validates that:
 * 1. A project can be created with 'active' status
 * 2. Status can be transitioned from 'active' to 'archived'
 * 3. Status can be transitioned from 'archived' to 'completed'
 * 4. All other project attributes remain intact during transitions
 * 5. The updated_at timestamp is updated on each status change
 */
export async function test_api_project_update_status_lifecycle_transitions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // Step 2: Create project with initial 'active' status
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const projectColor = "#FF5733";
  const activeProject = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: projectName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color: projectColor satisfies string &
          tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
        budget_hours: 100,
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(activeProject);
  // Step 3: Verify initial status is 'active'
  TestValidator.equals(
    "initial status is active",
    activeProject.status,
    "active",
  );
  TestValidator.equals("name matches", activeProject.name, projectName);
  TestValidator.equals("color matches", activeProject.color, projectColor);
  TestValidator.equals("budget_hours matches", activeProject.budget_hours, 100);
  // Step 4: Transition to 'archived' status
  const archivedProject = await api.functional.erpHrm.admin.projects.update(
    adminConnection,
    {
      projectId: activeProject.id,
      body: {
        status: "archived",
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(archivedProject);
  // Step 5: Validate status is 'archived' and attributes remain intact
  TestValidator.equals(
    "status is archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.equals(
    "name unchanged after archiving",
    archivedProject.name,
    projectName,
  );
  TestValidator.equals(
    "color unchanged after archiving",
    archivedProject.color,
    projectColor,
  );
  TestValidator.equals(
    "budget_hours unchanged after archiving",
    archivedProject.budget_hours,
    100,
  );
  TestValidator.predicate(
    "updated_at changed after archiving",
    archivedProject.updated_at > activeProject.updated_at,
  );
  // Step 6: Transition to 'completed' status
  const completedProject = await api.functional.erpHrm.admin.projects.update(
    adminConnection,
    {
      projectId: archivedProject.id,
      body: {
        status: "completed",
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(completedProject);
  // Step 7: Validate status is 'completed' and attributes remain intact
  TestValidator.equals(
    "status is completed",
    completedProject.status,
    "completed",
  );
  TestValidator.equals(
    "name unchanged after completing",
    completedProject.name,
    projectName,
  );
  TestValidator.equals(
    "color unchanged after completing",
    completedProject.color,
    projectColor,
  );
  TestValidator.equals(
    "budget_hours unchanged after completing",
    completedProject.budget_hours,
    100,
  );
  TestValidator.predicate(
    "updated_at changed after completing",
    completedProject.updated_at > archivedProject.updated_at,
  );
}
