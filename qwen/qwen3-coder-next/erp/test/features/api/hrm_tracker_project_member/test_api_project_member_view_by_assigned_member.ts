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

export async function test_api_project_member_view_by_assigned_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee1 joins and creates a project
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1 = await authorize_member_join(employee1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  const project = await api.functional.hrmTracker.member.projects.create(
    employee1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: RandomGenerator.alphabets(6),
      },
    },
  );
  typia.assert(project);
  // 2. Employee2 joins and is assigned to the project
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2 = await authorize_member_join(employee2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      employee1Connection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: employee2.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 3. Employee1 fetches the project member record of employee2
  const fetched =
    await api.functional.hrmTracker.member.projects.projectMembers.at(
      employee1Connection,
      {
        projectId: project.id,
        projectMemberId: projectMember.id,
      },
    );
  typia.assert(fetched);
  // 4. Validate fetched data
  TestValidator.equals("employee matches", fetched.employee?.id, employee2.id);
  TestValidator.equals("role matches", fetched.role, "member");
  TestValidator.predicate("has created_at", fetched.created_at !== undefined);
  TestValidator.predicate("has updated_at", fetched.updated_at !== undefined);
}
