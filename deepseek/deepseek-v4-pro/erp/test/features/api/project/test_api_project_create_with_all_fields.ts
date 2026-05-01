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
 * Test project creation with all available fields filled by a member with project:manage permission.
 *
 * Validates that a member holding the project:manage permission can create a new project providing every available field: a display name, a valid hex color code, a description explaining the project's purpose, positive budget hours for planning, and both start and end dates defining the project timeline with end_date after start_date.
 *
 * Verifies the response returns the complete project record with a server-generated UUID, status set to "active", all provided field values matching exactly, optional fields correctly populated, and created_at/updated_at timestamps present. Also confirms that initial relational counts (projectMembers, tasks, timelogs_count, timers_count) are empty/zero for a freshly created project.
 *
 * 1. Member authenticates via authorize_member_join with randomized credentials.
 * 2. Member creates a project with all fields: name, color_code, description, budget_hours, start_date, end_date.
 * 3. Validates complete project structure via typia.assert.
 * 4. Validates status is "active" and all input fields match the response.
 * 5. Validates initial empty state of projectMembers, tasks, timelogs_count, and timers_count.
 */
export async function test_api_project_create_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Prepare project creation body with all fields
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(
    now.getTime() + 90 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const body = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    color_code: typia.random<string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">>(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1>
    >(),
    start_date: startDate,
    end_date: endDate,
  } satisfies IErpHrmProject.ICreate;
  // 3. Create project using utility function
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body },
  );
  // 4. Validate complete project structure
  typia.assert(project);
  // 5. Validate business logic
  TestValidator.equals("status is active", project.status, "active");
  TestValidator.equals("name matches input", project.name, body.name);
  TestValidator.equals(
    "color_code matches input",
    project.color_code,
    body.color_code,
  );
  TestValidator.equals(
    "description matches input",
    project.description,
    body.description,
  );
  TestValidator.equals(
    "budget_hours matches input",
    project.budget_hours,
    body.budget_hours satisfies number | null as number | null,
  );
  TestValidator.equals(
    "start_date matches input",
    project.start_date,
    body.start_date satisfies (string & tags.Format<"date-time">) | null as
      | (string & tags.Format<"date-time">)
      | null,
  );
  TestValidator.equals(
    "end_date matches input",
    project.end_date,
    body.end_date satisfies (string & tags.Format<"date-time">) | null as
      | (string & tags.Format<"date-time">)
      | null,
  );
  TestValidator.equals(
    "projectMembers is empty",
    project.projectMembers.length,
    0,
  );
  TestValidator.equals("tasks is empty", project.tasks.length, 0);
  TestValidator.equals("timelogs_count is zero", project.timelogs_count, 0);
  TestValidator.equals("timers_count is zero", project.timers_count, 0);
}
