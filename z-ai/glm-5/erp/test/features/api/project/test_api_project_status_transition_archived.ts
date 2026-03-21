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

export async function test_api_project_status_transition_archived(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - join and become organization owner
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
        budget_hours: typia.random<number & tags.Minimum<0>>(),
      },
    },
  );
  typia.assert(project);
  // Store original values for comparison
  const originalName = project.name;
  const originalDescription = project.description;
  const originalBudgetHours = project.budgetHours;
  const originalStartDate = project.startDate;
  const originalEndDate = project.endDate;
  const originalCreatedAt = project.createdAt;
  const originalUpdatedAt = project.updatedAt;
  // Wait a moment to ensure updated_at timestamp will be different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Update project status to 'archived'
  const updateBody = {
    status: "archived" as const,
  } satisfies IErpHrmProject.IUpdate;
  const updatedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: updateBody,
    },
  );
  typia.assert(updatedProject);
  // 4. Verify status changed to 'archived'
  TestValidator.equals(
    "status should be archived",
    updatedProject.status,
    "archived",
  );
  // 5. Verify other data remains unchanged
  TestValidator.equals("name unchanged", updatedProject.name, originalName);
  TestValidator.equals(
    "description unchanged",
    updatedProject.description,
    originalDescription,
  );
  TestValidator.equals(
    "budgetHours unchanged",
    updatedProject.budgetHours,
    originalBudgetHours,
  );
  TestValidator.equals(
    "startDate unchanged",
    updatedProject.startDate,
    originalStartDate,
  );
  TestValidator.equals(
    "endDate unchanged",
    updatedProject.endDate,
    originalEndDate,
  );
  TestValidator.equals("id unchanged", updatedProject.id, project.id);
  TestValidator.equals(
    "createdAt unchanged",
    updatedProject.createdAt,
    originalCreatedAt,
  );
  // 6. Verify updated_at timestamp reflects modification
  TestValidator.predicate(
    "updatedAt should reflect modification time",
    new Date(updatedProject.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
