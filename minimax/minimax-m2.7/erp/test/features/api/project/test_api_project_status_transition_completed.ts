import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_status_transition_completed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create project with initial status 'active'
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color: "#3A7AFE" as string & typia.tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active" as const,
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(project);
  // Store original attributes for comparison
  const originalName = project.name;
  const originalColor = project.color;
  const originalDescription = project.description;
  // 3. Update project status to 'completed' via PUT
  const updatedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        status: "completed",
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(updatedProject);
  // 4. Validate status transition to 'completed'
  TestValidator.equals(
    "status is completed",
    updatedProject.status,
    "completed",
  );
  TestValidator.equals("name unchanged", updatedProject.name, originalName);
  TestValidator.equals("color unchanged", updatedProject.color, originalColor);
  TestValidator.equals(
    "description unchanged",
    updatedProject.description,
    originalDescription,
  );
  // 5. Test transition to 'archived' status (another valid transition target)
  const archivedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(archivedProject);
  TestValidator.equals(
    "status is archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.equals(
    "name unchanged after archiving",
    archivedProject.name,
    originalName,
  );
}
