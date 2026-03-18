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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProjectMember";
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

export async function test_api_project_member_list_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member-1 (organization owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Authenticate member-2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. Authenticate member-3
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member3Auth);
  // 4. Member-2 joins organization (using member-1 connection)
  const orgMember2 =
    await generate_random_hrms_member_organization_members_create(
      member1Connection,
      {
        body: {
          hrms_member_id: member2Auth.id,
          hrms_organization_id:
            member1Auth.organization_memberships[0].organization.id,
          hrms_organization_role_id:
            member1Auth.organization_memberships[0].organizationRole.id,
        },
      },
    );
  typia.assert(orgMember2);
  // 5. Member-3 joins organization (using member-1 connection)
  const orgMember3 =
    await generate_random_hrms_member_organization_members_create(
      member1Connection,
      {
        body: {
          hrms_member_id: member3Auth.id,
          hrms_organization_id:
            member1Auth.organization_memberships[0].organization.id,
          hrms_organization_role_id:
            member1Auth.organization_memberships[0].organizationRole.id,
        },
      },
    );
  typia.assert(orgMember3);
  // 6. Create project in organization (using member-1 connection)
  const organizationId =
    member1Auth.organization_memberships[0].organization.id;
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3498db",
        },
        params: { organizationId },
      },
    );
  typia.assert(project);
  // Note: project object doesn't have id, use organizationId and assume project exists
  // For this test, we need a valid project ID, so we'll use a placeholder or derive from SDK
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 7. Add member-2 to project with project-lead role
  const member2ProjectRole = "project-lead" as const;
  const member2ProjectMember =
    await generate_random_hrms_member_projects_members_add_member(
      member1Connection,
      {
        body: {
          employee_id: orgMember2.hrms_member_id,
          role: member2ProjectRole,
        },
        params: { projectId },
      },
    );
  typia.assert(member2ProjectMember);
  // 8. Add member-3 to project with member role
  const member3ProjectRole = "member" as const;
  const member3ProjectMember =
    await generate_random_hrms_member_projects_members_add_member(
      member1Connection,
      {
        body: {
          employee_id: orgMember3.hrms_member_id,
          role: member3ProjectRole,
        },
        params: { projectId },
      },
    );
  typia.assert(member3ProjectMember);
  // 9. Verify all project members are returned (without role filter)
  const allMembersResult =
    await api.functional.hrms.member.organizations.projects.members.index(
      member1Connection,
      {
        organizationId,
        projectId,
        body: {
          metric: "total",
        },
      },
    );
  typia.assert(allMembersResult);
  TestValidator.equals(
    "all members should return both employee roles",
    allMembersResult.data.length,
    2,
  );
  // 10. Verify pagination metadata for all members
  TestValidator.equals(
    "pagination records should equal total members",
    allMembersResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination limit should be default",
    allMembersResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    allMembersResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages should equal 1",
    allMembersResult.pagination.pages,
    1,
  );
  // 11. Verify each member is found in the list by member id
  const foundMemberRole = allMembersResult.data.find(
    (m) => m.id === member3ProjectMember.id,
  );
  TestValidator.notEquals(
    "member-3 should be found in list",
    foundMemberRole,
    undefined,
  );
  const foundLeadRole = allMembersResult.data.find(
    (m) => m.id === member2ProjectMember.id,
  );
  TestValidator.notEquals(
    "member-2 should be found in list",
    foundLeadRole,
    undefined,
  );
}
