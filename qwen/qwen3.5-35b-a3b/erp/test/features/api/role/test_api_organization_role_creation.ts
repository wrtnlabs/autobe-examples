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
import { generate_random_hrms_member_organizations_roles_create } from "../../../generate/generate_random_hrms_member_organizations_roles_create";
import { prepare_random_hrms_organization_role } from "../../../prepare/prepare_random_hrms_organization_role";

export async function test_api_organization_role_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create custom role with organization-specific connection
  // The memberConnection.headers is updated internally by authorize_member_join
  const roleName = "Project Manager";
  const permissions: string[] = [
    "project:manage",
    "employee:view",
    "timelog:edit",
  ];
  const role = await generate_random_hrms_member_organizations_roles_create(
    memberConnection,
    {
      params: {
        organizationId: typia.random<string & tags.Format<"uuid">>(),
      },
      body: {
        name: roleName,
        permissions,
      },
    },
  );
  typia.assert(role);
  // 3. Validate role properties
  TestValidator.equals("role name matches", role.name, roleName);
  TestValidator.equals(
    "is_builtin is false (custom role)",
    role.is_builtin,
    false,
  );
  TestValidator.equals(
    "permissions array matches",
    [...(role.permissions ?? [])].sort(),
    [...permissions].sort(),
  );
  TestValidator.notEquals(
    "organization reference is valid",
    role.organization,
    null as any,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(role.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(role.updated_at)),
  );
  // 4. Test business rule: duplicate role name should fail
  await TestValidator.error(
    "duplicate role name within organization should fail",
    async () => {
      await generate_random_hrms_member_organizations_roles_create(
        memberConnection,
        {
          params: {
            organizationId: role.organization.id,
          },
          body: {
            name: roleName,
            permissions: ["project:view"],
          },
        },
      );
    },
  );
  // 5. Test business rule: built-in role names should fail
  const builtInRoles = ["Owner", "Manager", "Employee"];
  for (const builtInRole of builtInRoles) {
    await TestValidator.error(
      `built-in role name '${builtInRole}' should fail`,
      async () => {
        await generate_random_hrms_member_organizations_roles_create(
          memberConnection,
          {
            params: {
              organizationId: role.organization.id,
            },
            body: {
              name: builtInRole,
              permissions: [],
            },
          },
        );
      },
    );
  }
}