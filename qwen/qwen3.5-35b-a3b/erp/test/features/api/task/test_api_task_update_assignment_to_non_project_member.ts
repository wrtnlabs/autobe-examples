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

export async function test_api_task_update_assignment_to_non_project_member(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create 3 members - project lead, project member, external user
  const leadConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const externalConnection: api.IConnection = { host: connection.host };
  // Authenticate as project lead
  const leadAuth = await authorize_member_join(leadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(leadAuth);
  // Authenticate as project member
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Authenticate as external user (not in project)
  const externalAuth = await authorize_member_join(externalConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(externalAuth);
  // Get organization from first member's organization memberships
  const organizationId = leadAuth.organization_memberships[0].organization.id;
  // Create project
  await generate_random_hrms_member_organizations_projects_create(
    leadConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color_code: "#3498db",
      },
      params: { organizationId },
    },
  );
  // Add project lead to project
  const leadProjectMember =
    await generate_random_hrms_member_projects_members_add_member(
      leadConnection,
      {
        body: {
          employee_id: leadAuth.id,
          role: "project-lead" as const,
        },
        params: { projectId: leadAuth.organization_memberships[0].id },
      },
    );
  typia.assert(leadProjectMember);
  // Get project ID from the project member's project reference
  const projectId: string = leadProjectMember.project.id;
  // Add project member to project
  const projectMember =
    await generate_random_hrms_member_projects_members_add_member(
      memberConnection,
      {
        body: {
          employee_id: memberAuth.id,
          role: "member" as const,
        },
        params: { projectId },
      },
    );
  typia.assert(projectMember);
  // Generate task ID for the test
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create task assigned to project member
  await generate_random_hrms_member_projects_tasks_create(leadConnection, {
    body: {
      title: RandomGenerator.name(2),
      hrms_employee_id: memberAuth.id,
    },
    params: { projectId },
  });
  // Edge case: Project lead attempts to reassign task to external user (NOT a project member)
  // This should fail with error about project membership requirement
  const leadConnectionForUpdate: api.IConnection = { host: connection.host };
  await authorize_member_join(leadConnectionForUpdate, {
    body: {
      email: leadAuth.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await TestValidator.error(
    "task assignment to non-project member should fail",
    async () => {
      await api.functional.hrms.member.tasks.update(leadConnectionForUpdate, {
        taskId,
        body: {
          hrms_employee_id: externalAuth.id,
        },
      });
    },
  );
}
