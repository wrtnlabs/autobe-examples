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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_role_retrieve_custom_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a custom role with initial permission (project:view)
  const customRoleName = `Custom Role ${RandomGenerator.alphabets(8)}`;
  const customRoleDescription = RandomGenerator.paragraph({ sentences: 2 });
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: customRoleName,
        description: customRoleDescription,
        permissions: ["project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  // 3. Add additional permission (time:view_all) to the custom role
  const additionalPermission =
    await generate_random_hrm_platform_member_roles_permissions_create(
      memberConnection,
      {
        body: {
          permission: "time:view_all",
        } satisfies IHrmPlatformRolePermission.ICreate,
        params: {
          roleId: customRole.id,
        },
      },
    );
  typia.assert(additionalPermission);
  // 4. Retrieve the custom role by its roleId
  const retrievedRole = await api.functional.hrmPlatform.member.roles.at(
    memberConnection,
    {
      roleId: customRole.id,
    },
  );
  typia.assert(retrievedRole);
  // 5. Validate the retrieved role details
  TestValidator.equals("role id matches", retrievedRole.id, customRole.id);
  TestValidator.equals("role name matches", retrievedRole.name, customRoleName);
  TestValidator.predicate(
    "role description matches",
    retrievedRole.description === customRoleDescription,
  );
  TestValidator.equals(
    "is_builtin is false for custom role",
    retrievedRole.is_builtin,
    false,
  );
  // 6. Validate permissions are correctly retrieved
  TestValidator.predicate(
    "has exactly 2 permissions",
    retrievedRole.permissions.length === 2,
  );
  const permissionCodes = retrievedRole.permissions.map((p) => p.permission);
  TestValidator.predicate(
    "contains project:view",
    permissionCodes.includes("project:view"),
  );
  TestValidator.predicate(
    "contains time:view_all",
    permissionCodes.includes("time:view_all"),
  );
  // 7. Validate organization context
  TestValidator.equals(
    "organization id matches",
    retrievedRole.organization_id,
    customRole.organization_id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedRole.organization.name,
    customRole.organization.name,
  );
  TestValidator.equals(
    "organization currency matches",
    retrievedRole.organization.currency,
    customRole.organization.currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    retrievedRole.organization.timezone,
    customRole.organization.timezone,
  );
}
