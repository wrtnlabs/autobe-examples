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
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";

export async function test_api_project_member_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (test user)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create second member account for project-lead role test
  const member2Connection: api.IConnection = { host: connection.host };
  const joinPassword2 = RandomGenerator.alphaNumeric(16);
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword2,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // 3. Create organization membership for first member
  const orgConnection: api.IConnection = { host: connection.host };
  const memberLoginResult = await api.functional.hrms.auth.member.login(
    orgConnection,
    {
      body: {
        email: memberAuth.email,
        password: joinPassword,
      },
    },
  );
  typia.assert(memberLoginResult);
  const orgMember1 =
    await generate_random_hrms_member_organization_members_create(
      orgConnection,
      {
        body: {
          hrms_member_id: memberAuth.id,
        },
      },
    );
  typia.assert(orgMember1);
  // 4. Create organization membership for second member
  const orgMember2 =
    await generate_random_hrms_member_organization_members_create(
      orgConnection,
      {
        body: {
          hrms_member_id: member2Auth.id,
        },
      },
    );
  typia.assert(orgMember2);
  // 5. Create project within that organization
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      orgConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
        params: {
          organizationId: orgMember1.organization.id,
        },
      },
    );
  typia.assert(project);
  // Extract project id using type assertion (SDK returns dashboard type but response has id)
  const projectId = (project as any).id as string & tags.Format<"uuid">;
  // 6. Add first employee to project with 'member' role
  const memberMembership =
    await generate_random_hrms_member_projects_members_add_member(
      orgConnection,
      {
        body: {
          employee_id: orgMember1.hrms_member_id,
          role: "member",
        },
        params: {
          projectId,
        },
      },
    );
  typia.assert(memberMembership);
  // 7. Add second employee to project with 'project-lead' role
  const leadMembership =
    await generate_random_hrms_member_projects_members_add_member(
      orgConnection,
      {
        body: {
          employee_id: orgMember2.hrms_member_id,
          role: "project-lead",
        },
        params: {
          projectId,
        },
      },
    );
  typia.assert(leadMembership);
  // 8. Validate membership records
  TestValidator.equals(
    "member role is correct",
    memberMembership.role,
    "member",
  );
  TestValidator.equals(
    "lead role is correct",
    leadMembership.role,
    "project-lead",
  );
  TestValidator.equals(
    "member status is active",
    memberMembership.status,
    "active",
  );
  TestValidator.equals(
    "lead status is active",
    leadMembership.status,
    "active",
  );
  TestValidator.equals(
    "member employee id matches",
    memberMembership.employee.id,
    orgMember1.hrms_member_id,
  );
  TestValidator.equals(
    "lead employee id matches",
    leadMembership.employee.id,
    orgMember2.hrms_member_id,
  );
  TestValidator.equals(
    "member project id matches",
    memberMembership.project.id,
    projectId,
  );
  TestValidator.equals(
    "lead project id matches",
    leadMembership.project.id,
    projectId,
  );
  TestValidator.equals(
    "member has created timestamp",
    memberMembership.created_at !== null,
    true,
  );
  TestValidator.equals(
    "lead has created timestamp",
    leadMembership.created_at !== null,
    true,
  );
}
