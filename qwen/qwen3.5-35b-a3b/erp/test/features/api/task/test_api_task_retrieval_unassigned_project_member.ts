import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_retrieval_unassigned_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A account and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create Member B account and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 3. Member A becomes organization owner (creates organization automatically)
  const orgMembershipA =
    await generate_random_hrms_member_organization_members_create(
      memberAConnection,
      {
        body: {},
      },
    );
  typia.assert(orgMembershipA);
  const organizationId: string = orgMembershipA.organization.id;
  // 4. Add Member B to same organization
  const orgMembershipB =
    await generate_random_hrms_member_organization_members_create(
      memberBConnection,
      {
        body: {
          hrms_member_id: memberBAuth.id,
          hrms_organization_id: orgMembershipA.organization.id,
          hrms_organization_role_id: orgMembershipA.organizationRole.id,
        },
      },
    );
  typia.assert(orgMembershipB);
  // 5. Create project within the organization (by Member A)
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
        params: { organizationId: orgMembershipA.organization.id },
      },
    );
  typia.assert(project);
  const projectId: string = (project as any).id;
  // 6. Add Member A to project
  const memberAInProject =
    await generate_random_hrms_member_projects_members_add_member(
      memberAConnection,
      {
        body: {
          employee_id: memberAAuth.id,
          role: "member",
        },
        params: { projectId },
      },
    );
  typia.assert(memberAInProject);
  // 7. Add Member B to same project
  const memberBInProject =
    await generate_random_hrms_member_projects_members_add_member(
      memberBConnection,
      {
        body: {
          employee_id: memberBAuth.id,
          role: "member",
        },
        params: { projectId },
      },
    );
  typia.assert(memberBInProject);
  // 8. Create task and assign to Member A
  const task = await generate_random_hrms_member_projects_tasks_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        hrms_employee_id: memberAAuth.id,
      },
      params: { projectId },
    },
  );
  typia.assert(task);
  const taskId: string = (task as any).id;
  const taskTitle: string = (task as any).title;
  const assignedEmployeeId: string = (task as any).hrms_employee_id;
  // 9. Retrieve task from Member B's perspective
  const retrievedTask = await api.functional.hrms.member.tasks.at(
    memberBConnection,
    {
      taskId,
    },
  );
  typia.assert(retrievedTask);
  // 10 & 11. Validate task details are returned correctly
  TestValidator.equals("task ID matches", (retrievedTask as any).id, taskId);
  TestValidator.equals(
    "task title matches",
    (retrievedTask as any).title,
    taskTitle,
  );
  TestValidator.equals(
    "assigned employee ID matches",
    (retrievedTask as any).hrms_employee_id,
    assignedEmployeeId,
  );
}
