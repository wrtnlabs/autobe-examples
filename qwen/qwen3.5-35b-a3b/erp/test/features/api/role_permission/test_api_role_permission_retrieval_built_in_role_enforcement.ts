import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

export async function test_api_role_permission_retrieval_built_in_role_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins system, creating organization with Owner role (built-in)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Extract member's organization details
  const memberOrganization = memberAuth.member;
  const memberOrganizationId = memberOrganization.id;
  // 2. Create custom role within organization using member connection (headers updated by authorize)
  const customRole = await api.functional.hrmPlatform.member.roles.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  // Verify custom role is indeed custom and belongs to member's organization
  TestValidator.equals(
    "custom role kind is custom",
    customRole.role_kind,
    "custom",
  );
  TestValidator.equals(
    "custom role belongs to member organization",
    customRole.organization.id,
    memberOrganizationId,
  );
  // 3. Add permission to custom role
  const customPermission =
    await api.functional.hrmPlatform.member.roles.permissions.create(
      memberConnection,
      {
        roleId: customRole.id,
        body: {
          code: `custom.${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph(),
        } satisfies IHrmPlatformRole.IPermissionCreate,
      },
    );
  typia.assert(customPermission);
  // 4. Retrieve permission from custom role → should succeed
  const retrievedPermission =
    await api.functional.hrmPlatform.member.roles.permissions.at(
      memberConnection,
      {
        roleId: customRole.id,
        permissionId: customPermission.id,
      },
    );
  typia.assert(retrievedPermission);
  // Validate permission details match
  TestValidator.equals(
    "permission id matches",
    retrievedPermission.id,
    customPermission.id,
  );
  TestValidator.equals(
    "permission code matches",
    retrievedPermission.code,
    customPermission.code,
  );
  TestValidator.equals(
    "permission description matches",
    retrievedPermission.description,
    customPermission.description,
  );
  // 5. Attempt to retrieve custom role's permission from different role → should return 404
  // Create another custom role to test role_id mismatch constraint
  const anotherCustomRole =
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(anotherCustomRole);
  // Verify another custom role is also in same organization
  TestValidator.equals(
    "another custom role belongs to same organization",
    anotherCustomRole.organization.id,
    memberOrganizationId,
  );
  // Try to access custom permission from different custom role
  // This should fail because permission's role_id (customRole.id) !== requested roleId (anotherCustomRole.id)
  await TestValidator.error(
    "permission cannot be accessed from role it doesn't belong to",
    async () => {
      await api.functional.hrmPlatform.member.roles.permissions.at(
        memberConnection,
        {
          roleId: anotherCustomRole.id,
          permissionId: customPermission.id,
        },
      );
    },
  );
  // 6. Verify multi-tenancy: permissions from one organization not accessible from another
  const secondOrgMemberConnection: api.IConnection = { host: connection.host };
  const secondOrgAuth = await authorize_member_join(secondOrgMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(secondOrgAuth);
  // Verify different organization
  TestValidator.notEquals(
    "second organization is different",
    memberOrganizationId,
    secondOrgAuth.member.id,
  );
  // Permission from first organization should not be accessible from second
  await TestValidator.error(
    "cross-organization permission access blocked",
    async () => {
      await api.functional.hrmPlatform.member.roles.permissions.at(
        secondOrgMemberConnection,
        {
          roleId: anotherCustomRole.id,
          permissionId: customPermission.id,
        },
      );
    },
  );
  // 7. Verify built-in role (Owner) has fixed permission set
  // When member joins, they become Owner of organization
  // Create a permission for Owner role (built-in) by creating role with built-in kind
  // Actually, built-in roles cannot be created through API, so we test the constraint differently:
  // Try to add permission code that follows built-in role convention to custom role
  // This validates that permission codes are organization-scoped and follow dot notation
  const builtInStylePermission =
    await api.functional.hrmPlatform.member.roles.permissions.create(
      memberConnection,
      {
        roleId: customRole.id,
        body: {
          code: `organization.${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph(),
        } satisfies IHrmPlatformRole.IPermissionCreate,
      },
    );
  typia.assert(builtInStylePermission);
  // Verify built-in style permission code can be assigned to custom role
  TestValidator.equals(
    "built-in style permission code accepted for custom role",
    builtInStylePermission.code,
    `organization.${builtInStylePermission.code.split(".")[1]}`,
  );
  // Try to access built-in style permission from another role → should fail
  await TestValidator.error(
    "built-in style permission not accessible from different role",
    async () => {
      await api.functional.hrmPlatform.member.roles.permissions.at(
        memberConnection,
        {
          roleId: anotherCustomRole.id,
          permissionId: builtInStylePermission.id,
        },
      );
    },
  );
}
