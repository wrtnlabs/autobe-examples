import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerProjectMember";
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

export async function test_api_project_member_list_role_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two members
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create a project as member1
  const project = await generate_random_hrm_tracker_member_projects_create(
    member1Connection,
    {},
  );
  // 3. Assign members to the project with different roles
  // Using hrm_tracker_employee_id property as defined in DTO
  const member1ProjectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      member1Connection,
      {
        params: { projectId: project.id },
        body: {
          hrm_tracker_employee_id: member1.id,
          role: "member" as const,
        },
      },
    );
  const member2ProjectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      member2Connection,
      {
        params: { projectId: project.id },
        body: {
          hrm_tracker_employee_id: member2.id,
          role: "project-lead" as const,
        },
      },
    );
  // 4. Filter by role "member" and validate
  const memberList =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      member1Connection,
      {
        projectId: project.id,
        body: { role: "member" } satisfies IHrmTrackerProjectMember.IRequest,
      },
    );
  typia.assert(memberList);
  TestValidator.equals("only one member returned", memberList.data.length, 1);
  TestValidator.equals("correct role", memberList.data[0].role, "member");
  // 5. Filter by role "project-lead" and validate
  const leadList =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      member1Connection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
        } satisfies IHrmTrackerProjectMember.IRequest,
      },
    );
  typia.assert(leadList);
  TestValidator.equals("only one lead returned", leadList.data.length, 1);
  TestValidator.equals("correct role", leadList.data[0].role, "project-lead");
  // 6. Verify no results for non-existent role - use empty body instead
  const noneList =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      member1Connection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(noneList);
  TestValidator.equals("no results for empty filter", noneList.data.length, 2);
}
