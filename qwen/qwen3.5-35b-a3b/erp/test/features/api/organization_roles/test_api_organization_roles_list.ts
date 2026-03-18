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

export async function test_api_organization_roles_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (this creates the member and an initial organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // Extract organizationId from member's organization_memberships (first org created on join)
  const firstMembership = member.organization_memberships[0];
  if (!firstMembership) {
    throw new Error("Member has no organization memberships");
  }
  const organizationId = firstMembership.organization.id;
  // 2. Create a custom role within the organization
  const customRole =
    await api.functional.hrms.member.organizations.roles.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(3),
          permissions: ["employee:view"],
        } satisfies IHrmsOrganizationRole.ICreate,
      },
    );
  typia.assert(customRole);
  // 3. Call the role listing endpoint
  const rolesResponse =
    await api.functional.hrms.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {} satisfies IHrmsOrganizationRole.IRequest,
      },
    );
  typia.assert(rolesResponse);
  // 4. Verify HTTP 200 OK (response returned successfully, typia.assert confirms structure)
  TestValidator.equals(
    "response has data array",
    rolesResponse.data.length > 0,
    true,
  );
  // 5. Verify pagination metadata
  const pagination = rolesResponse.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    pagination.records,
    rolesResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  // 6. Verify all roles belong to the specified organization
  for (const role of rolesResponse.data) {
    TestValidator.equals(
      "role belongs to organization",
      role.organization.id,
      organizationId,
    );
    TestValidator.equals(
      "role organization name matches",
      role.organization.name,
      firstMembership.organization.name,
    );
  }
  // 7. Verify built-in roles exist and have correct is_builtin flag
  const builtinRoles = rolesResponse.data.filter(
    (role) => role.is_builtin === true,
  );
  const customRoles = rolesResponse.data.filter(
    (role) => role.is_builtin === false,
  );
  // Built-in roles should include Owner, Manager, Employee
  TestValidator.equals("number of built-in roles", builtinRoles.length, 3);
  const builtinNames = builtinRoles.map((r) => r.name).sort();
  TestValidator.equals(
    "built-in roles include Owner, Manager, Employee",
    builtinNames,
    ["Employee", "Manager", "Owner"],
  );
  // Verify each built-in role has is_builtin=true
  for (const role of builtinRoles) {
    TestValidator.equals(
      "built-in role is_builtin flag",
      role.is_builtin,
      true,
    );
  }
  // 8. Verify custom role exists and has correct is_builtin flag
  TestValidator.equals("number of custom roles", customRoles.length, 1);
  TestValidator.equals(
    "custom role name",
    customRoles[0].name,
    customRole.name,
  );
  TestValidator.equals(
    "custom role is_builtin flag",
    customRoles[0].is_builtin,
    false,
  );
  // 9. Verify total records count matches actual roles returned
  TestValidator.equals(
    "total records matches actual count",
    pagination.records,
    4,
  );
  // 10. Verify members_count is accurate (Owner should have at least 1 member - the member we created)
  const ownerRole = builtinRoles.find((r) => r.name === "Owner");
  TestValidator.equals(
    "owner role has at least 1 member",
    ownerRole && ownerRole.members_count >= 1,
    true,
  );
  // 11. Verify all required fields exist in each role
  for (const role of rolesResponse.data) {
    TestValidator.equals(
      "role has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        role.id,
      ),
      true,
    );
    TestValidator.predicate("role has name", role.name.length > 0);
    TestValidator.predicate(
      "role has is_builtin boolean",
      typeof role.is_builtin === "boolean",
    );
    TestValidator.predicate(
      "role has organization",
      role.organization !== undefined,
    );
    TestValidator.predicate(
      "role has created_at datetime",
      role.created_at !== undefined,
    );
    TestValidator.predicate(
      "role has updated_at datetime",
      role.updated_at !== undefined,
    );
    TestValidator.predicate(
      "role has members_count integer",
      typeof role.members_count === "number",
    );
  }
}