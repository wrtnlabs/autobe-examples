import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_roles_create } from "../../../generate/generate_random_hrms_member_organizations_roles_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_organization_role } from "../../../prepare/prepare_random_hrms_organization_role";

export async function test_api_organization_roles_filter_builtin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(member);
  // 2. Extract organization from member's organization_memberships
  if (member.organization_memberships.length === 0) {
    throw new Error("Member has no organization memberships");
  }
  const firstMembership = member.organization_memberships[0];
  const organizationId = firstMembership.organization.id;
  typia.assert(organizationId);
  // 3. Create custom role
  const customRoleConnection: api.IConnection = { host: connection.host };
  const customRole =
    await api.functional.hrms.member.organizations.roles.create(
      customRoleConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          permissions: ["employee:view"],
        } satisfies IHrmsOrganizationRole.ICreate,
      },
    );
  typia.assert(customRole);
  // 4. Create organization membership with custom role
  const membershipConnection: api.IConnection = { host: connection.host };
  const membership =
    await api.functional.hrms.member.organization_members.create(
      membershipConnection,
      {
        body: {
          hrms_member_id: member.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id: customRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(membership);
  // 5. Test is_builtin=true filter (built-in roles)
  const builtInRolesConnection: api.IConnection = { host: connection.host };
  const builtInRoles =
    await api.functional.hrms.member.organizations.roles.index(
      builtInRolesConnection,
      {
        organizationId,
        body: {
          is_builtin: true,
          limit: 100,
        } satisfies IHrmsOrganizationRole.IRequest,
      },
    );
  typia.assert(builtInRoles);
  // Validate built-in roles filter
  TestValidator.equals(
    "built-in roles pagination current",
    builtInRoles.pagination.current,
    1,
  );
  TestValidator.equals(
    "built-in roles pagination records",
    builtInRoles.pagination.records,
    3,
  );
  TestValidator.equals(
    "built-in roles data length",
    builtInRoles.data.length,
    3,
  );
  for (const role of builtInRoles.data) {
    TestValidator.equals(
      "built-in role is_builtin flag",
      role.is_builtin,
      true,
    );
  }
  // 6. Test is_builtin=false filter (custom roles)
  const customFilterConnection: api.IConnection = { host: connection.host };
  const customRoles =
    await api.functional.hrms.member.organizations.roles.index(
      customFilterConnection,
      {
        organizationId,
        body: {
          is_builtin: false,
          limit: 100,
        } satisfies IHrmsOrganizationRole.IRequest,
      },
    );
  typia.assert(customRoles);
  // Validate custom roles filter
  TestValidator.equals(
    "custom roles pagination records",
    customRoles.pagination.records,
    1,
  );
  TestValidator.equals("custom roles data length", customRoles.data.length, 1);
  for (const role of customRoles.data) {
    TestValidator.equals("custom role is_builtin flag", role.is_builtin, false);
  }
  // 7. Test is_builtin=null filter (all roles)
  const allRolesConnection: api.IConnection = { host: connection.host };
  const allRoles = await api.functional.hrms.member.organizations.roles.index(
    allRolesConnection,
    {
      organizationId,
      body: {
        is_builtin: null,
        limit: 100,
      } satisfies IHrmsOrganizationRole.IRequest,
    },
  );
  typia.assert(allRoles);
  // Validate all roles filter
  TestValidator.equals(
    "all roles pagination records",
    allRoles.pagination.records,
    4,
  );
  TestValidator.equals("all roles data length", allRoles.data.length, 4);
}
