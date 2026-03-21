import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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
 * Test project creation with all optional fields populated.
 *
 * Scenario:
 * 1. Create member account and first organization as owner (grants 'project:manage' permission)
 * 2. Create a project with all fields populated (name, color_code, description, budget_hours, start_date, end_date)
 * 3. Verify all fields are correctly stored and returned
 * 4. Verify status defaults to 'active'
 * 5. Verify business validation: end_date before start_date should fail
 */
export async function test_api_project_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account with organization (becomes owner with 'project:manage' permission)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Prepare test data for project with all optional fields
  const projectName = RandomGenerator.name(2);
  const colorCode = typia.random<string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">>();
  const description = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const budgetHours = typia.random<number & tags.Minimum<0>>();
  const now = new Date();
  const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const endDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
  // Step 3: Create project with all optional fields
  const project = await api.functional.erpHrm.member.projects.create(
    memberConnection,
    {
      body: {
        name: projectName,
        color_code: colorCode,
        description: description,
        budget_hours: budgetHours,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Step 4: Verify all fields are correctly stored and returned
  TestValidator.equals("project name matches", project.name, projectName);
  TestValidator.equals("color code matches", project.colorCode, colorCode);
  TestValidator.equals(
    "description preserved",
    project.description,
    description,
  );
  TestValidator.equals(
    "budget hours matches",
    project.budgetHours,
    budgetHours,
  );
  TestValidator.equals("status defaults to active", project.status, "active");
  // Verify dates are stored correctly (allow 1 second tolerance for clock differences)
  TestValidator.predicate(
    "start date stored correctly",
    project.startDate !== null &&
      Math.abs(new Date(project.startDate).getTime() - startDate.getTime()) <
        1000,
  );
  TestValidator.predicate(
    "end date stored correctly",
    project.endDate !== null &&
      Math.abs(new Date(project.endDate).getTime() - endDate.getTime()) < 1000,
  );
  // Verify organization is set
  TestValidator.predicate(
    "organization is set",
    project.organization !== null && project.organization !== undefined,
  );
  // Step 5: Test business validation - end_date before start_date should fail
  await TestValidator.error(
    "end_date before start_date should fail",
    async () => {
      const invalidStartDate = new Date(
        now.getTime() + 60 * 24 * 60 * 60 * 1000,
      );
      const invalidEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await api.functional.erpHrm.member.projects.create(memberConnection, {
        body: {
          name: RandomGenerator.name(2),
          color_code: colorCode,
          start_date: invalidStartDate.toISOString(),
          end_date: invalidEndDate.toISOString(),
        } satisfies IErpHrmProject.ICreate,
      });
    },
  );
}
