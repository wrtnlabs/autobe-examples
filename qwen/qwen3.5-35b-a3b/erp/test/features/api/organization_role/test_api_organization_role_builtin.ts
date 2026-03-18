import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_role_builtin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and establish authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Test retrieving a built-in organization role
  // Built-in roles (Owner, Manager, Employee) have predefined UUIDs
  const builtinRoleUuid = "550e8400-e29b-41d4-a716-446655440000"; // example UUID
  const testOrganizationId = "550e8400-e29b-41d4-a716-446655440000"; // example organization UUID
  // 3. Attempt to retrieve built-in role
  const role = await api.functional.hrms.member.organizations.roles.at(
    memberConnection,
    { organizationId: testOrganizationId, roleId: builtinRoleUuid },
  );
  typia.assert(role);
  // 4. Validate role structure - is_builtin flag must exist and be boolean
  TestValidator.predicate(
    "role has is_builtin property",
    typeof role.is_builtin === "boolean",
  );
  // 5. Validate permissions array exists and contains string elements
  TestValidator.predicate(
    "role has permissions array",
    Array.isArray(role.permissions),
  );
  if (role.permissions.length > 0) {
    TestValidator.predicate(
      "permissions are strings",
      role.permissions.every((perm: unknown) => typeof perm === "string"),
    );
  }
  // 6. Validate organization field exists with required properties
  TestValidator.equals(
    "role has organization",
    role.organization !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has id",
    typeof role.organization.id === "string",
    true,
  );
  TestValidator.equals(
    "organization has name",
    typeof role.organization.name === "string",
    true,
  );
  // 7. Validate timestamps are valid date-time format
  TestValidator.equals(
    "role has created_at timestamp",
    typeof role.created_at === "string",
    true,
  );
  TestValidator.equals(
    "role has updated_at timestamp",
    typeof role.updated_at === "string",
    true,
  );
  // 8. Test with different role name examples (Owner, Manager, Employee)
  const ownerRoleId = "660e8400-e29b-41d4-a716-446655440000";
  const managerRoleId = "770e8400-e29b-41d4-a716-446655440000";
  const employeeRoleId = "880e8400-e29b-41d4-a716-446655440000";
  const ownerRole = await api.functional.hrms.member.organizations.roles.at(
    memberConnection,
    { organizationId: testOrganizationId, roleId: ownerRoleId },
  );
  typia.assert(ownerRole);
  const managerRole = await api.functional.hrms.member.organizations.roles.at(
    memberConnection,
    { organizationId: testOrganizationId, roleId: managerRoleId },
  );
  typia.assert(managerRole);
  const employeeRole = await api.functional.hrms.member.organizations.roles.at(
    memberConnection,
    { organizationId: testOrganizationId, roleId: employeeRoleId },
  );
  typia.assert(employeeRole);
  // 9. Validate all built-in roles share is_builtin = true pattern
  TestValidator.equals("owner role is builtin", ownerRole.is_builtin, true);
  TestValidator.equals("manager role is builtin", managerRole.is_builtin, true);
  TestValidator.equals(
    "employee role is builtin",
    employeeRole.is_builtin,
    true,
  );
}