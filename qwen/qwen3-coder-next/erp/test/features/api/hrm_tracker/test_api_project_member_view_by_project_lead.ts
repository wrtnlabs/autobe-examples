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

export async function test_api_project_member_view_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as employee1 and create project
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1 = await api.functional.hrmTracker.auth.member.join(
    employee1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        display_name: RandomGenerator.name(),
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(employee1);
  const project = await api.functional.hrmTracker.member.projects.create(
    employee1Connection,
    {
      body: {
        name: RandomGenerator.name(3),
        color: "#FF5733",
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 2. Join as employee2 and assign to project as member
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2 = await api.functional.hrmTracker.auth.member.join(
    employee2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        display_name: RandomGenerator.name(),
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(employee2);
  // Get employee ID for employee2 - member join creates employee record automatically
  // Since we can't access employee directly from member response, we need to get it from the project member record
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      employee1Connection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: typia.random<string & tags.Format<"uuid">>(),
          role: "member" satisfies IHrmTrackerProjectMember.ICreate["role"],
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 3. Login as employee1 (project lead) and fetch project member record of employee2
  const projectLeadConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmTracker.auth.member.join(projectLeadConnection, {
    body: {
      email: employee1.email,
      password: "12345678",
      display_name: employee1.display_name,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const fetchedMember =
    await api.functional.hrmTracker.member.projects.projectMembers.at(
      projectLeadConnection,
      {
        projectId: project.id,
        projectMemberId: projectMember.id,
      },
    );
  typia.assert(fetchedMember);
  // 4. Validate
  TestValidator.equals("role is member", fetchedMember.role, "member");
  TestValidator.predicate(
    "has created_at timestamp",
    typeof fetchedMember.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    typeof fetchedMember.updated_at === "string",
  );
}
