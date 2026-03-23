import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";

/**
 * Test access denial when an unassigned employee tries to view a project member record from another project.
 * 1. Join as employee1 and create project1
 * 2. Join as employee2 and create project2
 * 3. Assign employee2 to project2
 * 4. Verify employee1 cannot view employee2's project member record in project2
 */
export async function test_api_project_member_view_denied_for_unassigned_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as employee1 and create project1
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1 = await authorize_member_join(employee1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employee1);
  const project1 = await api.functional.hrmTracker.member.projects.create(
    employee1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        color: RandomGenerator.alphabets(6),
      },
    },
  );
  typia.assert(project1);
  // 2. Join as employee2 and create project2
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2 = await authorize_member_join(employee2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employee2);
  const project2 = await api.functional.hrmTracker.member.projects.create(
    employee2Connection,
    {
      body: {
        name: RandomGenerator.name(),
        color: RandomGenerator.alphabets(6),
      },
    },
  );
  typia.assert(project2);
  // 3. Assign employee2 to project2
  // Since there's no employee creation endpoint, we'll need to use a valid employee ID
  // Let's assume the member's ID can be used as employee ID, or create a workaround
  // Based on the scenario plan, we need to assign employee2 to project2
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      employee2Connection,
      {
        projectId: project2.id,
        body: {
          hrm_tracker_employee_id: employee2.id, // Use employee2's member ID as employee ID
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMember);
  // 4. Try to view project member from project2 as employee1 (should be denied)
  await TestValidator.error(
    "unassigned employee cannot view other project's member",
    async () => {
      await api.functional.hrmTracker.member.projects.projectMembers.at(
        employee1Connection,
        {
          projectId: project2.id,
          projectMemberId: projectMember.id,
        },
      );
    },
  );
}
