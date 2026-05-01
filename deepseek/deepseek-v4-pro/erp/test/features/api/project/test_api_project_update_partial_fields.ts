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
 * Verify partial update behavior for the project endpoint.
 *
 * Validates that when only a subset of fields is provided in a PUT request, the specified fields are modified while all omitted fields retain their original values. This test ensures the API handles partial updates correctly without inadvertently clearing or resetting unmentioned properties.
 *
 * The test specifically confirms that nullable optional fields — description, budget_hours, start_date, and end_date — are preserved exactly as set during creation, even when omitted from the update payload.
 *
 * 1. Authenticate a new member via join to obtain an organization-scoped connection.
 * 2. Create a project with all optional fields populated: description, budget_hours, start_date, and end_date.
 * 3. Send a PUT request containing only name and budget_hours in the body, omitting description, color_code, start_date, and end_date.
 * 4. Confirm name and budget_hours reflect the updated values.
 * 5. Confirm description, color_code, start_date, and end_date remain identical to the originally created project.
 */
export async function test_api_project_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project with all optional fields populated
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >() satisfies number as number,
        start_date: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(project);
  // 3. Partial update — only name and budget_hours
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newBudgetHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >() satisfies number as number;
  const updated = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        name: newName,
        budget_hours: newBudgetHours,
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate partial update behavior
  TestValidator.equals("updated name", updated.name, newName);
  TestValidator.equals(
    "updated budget_hours",
    updated.budget_hours,
    newBudgetHours,
  );
  TestValidator.equals(
    "description unchanged",
    updated.description,
    project.description,
  );
  TestValidator.equals(
    "color_code unchanged",
    updated.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "start_date unchanged",
    updated.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "end_date unchanged",
    updated.end_date,
    project.end_date,
  );
}
