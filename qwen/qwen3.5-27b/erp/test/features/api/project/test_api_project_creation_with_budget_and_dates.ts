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
 * Test creating a project with all optional fields including description, budget_hours, start_date, and end_date.
 *
 * Validates the complete project creation flow with comprehensive optional field population. Ensures that the project correctly stores budget tracking information and timeline dates, with proper organization association from the authenticated member's context.
 *
 * Special attention is given to verifying that the end_date is after start_date, all optional fields are correctly persisted, and that newly created projects have empty projectMembers and tasks arrays.
 *
 * 1. Member authenticates via join to establish organization context.
 * 2. Project is created with all optional fields: description, budget_hours, start_date, end_date.
 * 3. Validates that end_date is after start_date in the response.
 * 4. Confirms organization association from authenticated member's context.
 * 5. Verifies projectMembers and tasks arrays are empty for new project.
 */
export async function test_api_project_creation_with_budget_and_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create project with all optional fields
  const now = new Date();
  const startDate = new Date(now.getTime() + 86400000).toISOString(); // tomorrow
  const endDate = new Date(now.getTime() + 86400000 * 30).toISOString(); // 30 days from now
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10>
        >(),
        start_date: startDate,
        end_date: endDate,
      },
    },
  );
  typia.assert(project);
  // 3. Validate end_date is after start_date
  TestValidator.predicate(
    "end_date after start_date",
    project.start_date !== null &&
      project.end_date !== null &&
      new Date(project.end_date).getTime() >
        new Date(project.start_date).getTime(),
  );
  // 4. Validate budget_hours is positive
  TestValidator.predicate(
    "budget_hours is positive",
    project.budget_hours !== null && project.budget_hours > 0,
  );
  // 5. Validate start_date matches input
  TestValidator.equals(
    "start_date matches input",
    project.start_date,
    startDate,
  );
  // 6. Validate end_date matches input
  TestValidator.equals("end_date matches input", project.end_date, endDate);
  // 7. Verify projectMembers and tasks arrays are empty
  TestValidator.equals(
    "projectMembers array is empty",
    project.projectMembers.length,
    0,
  );
  TestValidator.equals("tasks array is empty", project.tasks.length, 0);
}
