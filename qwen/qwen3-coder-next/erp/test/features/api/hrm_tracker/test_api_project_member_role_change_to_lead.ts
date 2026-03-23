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

export async function test_api_project_member_role_change_to_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create project
  const project = await api.functional.hrmTracker.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        color: "#FF5733",
        description: null,
        budget_hours: null,
        start_date: null,
        end_date: null,
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create project member with 'member' role
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: member.id,
          role: "member",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  TestValidator.equals("initial role", projectMember.role, "member");
  // 4. Update role to 'project-lead'
  const updated =
    await api.functional.hrmTracker.member.projects.projectMembers.update(
      memberConnection,
      {
        projectId: project.id,
        projectMemberId: projectMember.id,
        body: {
          role: "project-lead",
        } satisfies IHrmTrackerProjectMember.IUpdate,
      },
    );
  typia.assert(updated);
  // 5. Verify role change
  TestValidator.equals("updated role", updated.role, "project-lead");
}
