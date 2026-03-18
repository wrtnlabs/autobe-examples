import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_complete_active_project_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization for the project
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create an active project with explicit status
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies DeepPartial<IErpHrmProject.ICreate>,
    },
  );
  typia.assert(project);
  // Verify initial state is active
  TestValidator.equals(
    "initial project status is active",
    project.status,
    "active",
  );
  // Store original values for comparison
  const originalUpdatedAt = project.updated_at;
  const originalOrganizationId = project.organization.id;
  const originalName = project.name;
  const originalCreatedAt = project.created_at;
  const originalId = project.id;
  const originalColorCode = project.color_code;
  const originalDescription = project.description;
  const originalBudgetHours = project.budget_hours;
  // Complete the project
  const completedProject = await api.functional.erpHrm.member.projects.complete(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(completedProject);
  // Validate status transition from active to completed
  TestValidator.equals(
    "project status changed to completed",
    completedProject.status,
    "completed",
  );
  // Validate updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    completedProject.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    completedProject.updated_at > completedProject.created_at,
  );
  // Validate all related data is preserved
  TestValidator.equals(
    "organization id preserved",
    completedProject.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals("project id unchanged", completedProject.id, originalId);
  TestValidator.equals("name preserved", completedProject.name, originalName);
  TestValidator.equals(
    "created_at unchanged",
    completedProject.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "color_code preserved",
    completedProject.color_code,
    originalColorCode,
  );
  TestValidator.equals(
    "description preserved",
    completedProject.description,
    originalDescription,
  );
  TestValidator.equals(
    "budget_hours preserved",
    completedProject.budget_hours,
    originalBudgetHours,
  );
}
