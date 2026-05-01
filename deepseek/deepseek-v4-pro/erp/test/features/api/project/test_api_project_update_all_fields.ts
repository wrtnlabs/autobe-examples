import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test project update with all editable fields modified simultaneously.
 *
 * Validates the complete project update workflow where a member with project management permission modifies every editable field of an existing project in a single PUT request. The test covers name change, description addition, color code replacement, budget hours assignment, and timeline date setting with proper ordering.
 *
 * Verifies that the response returns the full updated project record with all fields reflecting the new values, the status remains active (unchanged by this endpoint), and the updated_at timestamp advances beyond the original creation time. Also confirms that system-managed fields (id, organization_id) are preserved.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Project is created with minimal required fields (name, color_code) via utility.
 * 3. All editable fields are updated: name, description, color_code, budget_hours, start_date, end_date.
 * 4. Response is validated for correct field values, status preservation, and timestamp advancement.
 */
export async function test_api_project_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project with minimal required fields
  const originalName = RandomGenerator.paragraph({ sentences: 2 });
  const originalColor = "#FF5733";
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: originalName,
        color_code: originalColor,
      },
    },
  );
  typia.assert(project);
  // 3. Update all editable fields
  const newName = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const newColor = "#00A2FF";
  const newBudgetHours = 120;
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const updatedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        name: newName,
        description: newDescription,
        color_code: newColor,
        budget_hours: newBudgetHours,
        start_date: startDate,
        end_date: endDate,
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(updatedProject);
  // 4. Validate updated fields
  TestValidator.equals("name updated", updatedProject.name, newName);
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    newDescription,
  );
  TestValidator.equals(
    "color_code updated",
    updatedProject.color_code,
    newColor,
  );
  TestValidator.equals(
    "budget_hours updated",
    updatedProject.budget_hours,
    newBudgetHours,
  );
  TestValidator.equals(
    "start_date updated",
    updatedProject.start_date,
    startDate,
  );
  TestValidator.equals("end_date updated", updatedProject.end_date, endDate);
  // 5. Validate preserved fields
  TestValidator.equals(
    "status remains active",
    updatedProject.status,
    "active",
  );
  TestValidator.notEquals(
    "updated_at advanced",
    updatedProject.updated_at,
    project.updated_at,
  );
  TestValidator.equals("id unchanged", updatedProject.id, project.id);
  TestValidator.equals(
    "organization_id unchanged",
    updatedProject.organization_id,
    project.organization_id,
  );
}
