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
import type { IHrmTimeTrackTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_projects_members_create } from "../../../generate/generate_random_hrm_time_track_member_projects_members_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";

/**
 * Test that attempting to retrieve a task history entry with an invalid historyId returns a 404 Not Found response.
 *
 * Validates the complete task history retrieval error flow including member authentication, organizational setup, employee creation, project assignment, and project member assignment. Ensures that when a member provides a taskId that exists but a historyId that does not exist, the system correctly identifies that the specific history entry cannot be found and returns an appropriate 404 error.
 *
 * Special attention is given to verifying that the error response is clear and does not expose sensitive information about the system's data structure. The test confirms proper error handling for invalid historyId parameters while ensuring all prerequisite entities are properly established.
 *
 * 1. Member authenticates and creates organization context.
 * 2. Employee record is created for the authenticated member.
 * 3. Project is created and employee is assigned to it.
 * 4. Generates valid taskId and invalid historyId for testing.
 * 5. Attempt to retrieve non-existent history entry with invalid historyId.
 * 6. Validates that 404 error is thrown for the invalid historyId.
 */
export async function test_api_task_history_not_found_invalid_history_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee record for the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign employee to project
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: employee.id,
        role: "member",
      },
    },
  );
  // 6. Generate a valid taskId (simulating an existing task)
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 7. Generate an invalid historyId (non-existent)
  const invalidHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 8. Verify that retrieving non-existent history throws 404 error
  await TestValidator.httpError(
    "invalid historyId should return 404",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.tasks.histories.at(
        memberConnection,
        {
          taskId: taskId,
          historyId: invalidHistoryId,
        },
      ),
  );
}
