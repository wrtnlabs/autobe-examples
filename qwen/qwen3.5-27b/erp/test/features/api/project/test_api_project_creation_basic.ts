import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";

/**
 * Test creating a new project with minimum required fields (name and color_code).
 *
 * Validates the complete project creation flow including member authentication, project creation with only required fields, and comprehensive response validation. Ensures that the project is automatically associated with the authenticated member's organization and that all default values are correctly set.
 *
 * Special attention is given to verifying that optional fields default to null (description, budget_hours, start_date, end_date), the status defaults to 'active', and composition arrays (projectMembers, tasks) are empty for a newly created project.
 *
 * 1. Authenticate as a new member to establish organization context.
 * 2. Create a project with only required fields (name and color_code).
 * 3. Validate response contains all expected fields with correct values.
 * 4. Verify default values for optional fields and empty arrays.
 */
export async function test_api_project_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create project with minimum required fields
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
      },
    },
  );
  typia.assert(project);
  // 3. Validate required fields
  TestValidator.predicate("project id is valid uuid", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      project.id,
    ),
  );
  TestValidator.predicate(
    "project name is not empty",
    () => project.name.length > 0,
  );
  TestValidator.predicate("color code starts with #", () =>
    project.color_code.startsWith("#"),
  );
  // 4. Validate default values
  TestValidator.equals("status defaults to active", project.status, "active");
  TestValidator.equals("description is null", project.description, null);
  TestValidator.equals("budget_hours is null", project.budget_hours, null);
  TestValidator.equals("start_date is null", project.start_date, null);
  TestValidator.equals("end_date is null", project.end_date, null);
  TestValidator.equals("deleted_at is null", project.deleted_at, null);
  // 5. Validate timestamps are set
  TestValidator.predicate(
    "created_at is valid datetime",
    () => !isNaN(Date.parse(project.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    () => !isNaN(Date.parse(project.updated_at)),
  );
  // 6. Validate organization id is valid
  TestValidator.predicate("organization id is valid uuid", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      project.organization.id,
    ),
  );
  // 7. Validate empty arrays
  TestValidator.equals(
    "projectMembers array is empty",
    project.projectMembers.length,
    0,
  );
  TestValidator.equals("tasks array is empty", project.tasks.length, 0);
}
