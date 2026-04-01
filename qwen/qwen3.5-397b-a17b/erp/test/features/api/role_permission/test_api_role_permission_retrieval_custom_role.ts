import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_permissions_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_role_permission_retrieval_custom_role(
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
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create custom role with different permission (not project:view)
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        permissions: ["employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  // Verify custom role is not built-in
  TestValidator.equals(
    "role is custom (not built-in)",
    customRole.is_builtin,
    false,
  );
  TestValidator.equals(
    "role organization matches",
    customRole.organization.id,
    organization.id,
  );
  // 4. Add permission to custom role (project:view)
  const permissionAssignment =
    await generate_random_hrm_platform_member_roles_permissions_create(
      memberConnection,
      {
        params: {
          roleId: customRole.id,
        },
        body: {
          permission: "project:view",
        } satisfies IHrmPlatformRolePermission.ICreate,
      },
    );
  typia.assert(permissionAssignment);
  // 5. Retrieve the permission assignment
  const retrievedPermission =
    await api.functional.hrmPlatform.member.roles.permissions.at(
      memberConnection,
      {
        roleId: customRole.id,
        permissionId: permissionAssignment.id,
      },
    );
  typia.assert(retrievedPermission);
  // 6. Validate retrieved permission assignment
  TestValidator.equals(
    "permission code matches",
    retrievedPermission.permission,
    "project:view",
  );
  TestValidator.equals(
    "permission ID matches",
    retrievedPermission.id,
    permissionAssignment.id,
  );
  TestValidator.equals(
    "role ID matches",
    retrievedPermission.role.id,
    customRole.id,
  );
  TestValidator.equals(
    "role is custom (not built-in)",
    retrievedPermission.role.is_builtin,
    false,
  );
  TestValidator.equals(
    "role name matches",
    retrievedPermission.role.name,
    customRole.name,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedPermission.role.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedPermission.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedPermission.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    retrievedPermission.deleted_at,
    null,
  );
}
