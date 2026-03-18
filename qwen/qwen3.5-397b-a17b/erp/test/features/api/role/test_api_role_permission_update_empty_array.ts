import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_role_permission_update_empty_array(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection and organization
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create custom role with initial permissions
  const initialPermissions: IHrmPlatformRolePermission.ICreate[] = [
    { permission: "employee:view" },
    { permission: "project:view" },
    { permission: "time:view_all" },
  ];
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: initialPermissions,
      },
    },
  );
  typia.assert(customRole);
  // Verify initial permissions were set and role is custom (not built-in)
  TestValidator.equals(
    "initial permission count",
    customRole.permissions.length,
    3,
  );
  TestValidator.predicate(
    "role is custom (not built-in)",
    !customRole.built_in,
  );
  // 4. Update role with empty permissions array
  const updatedRole =
    await api.functional.hrmPlatform.member.roles.permissions.updatePermissions(
      memberConnection,
      {
        roleId: customRole.id,
        body: {
          permissions: [],
        } satisfies IHrmPlatformRole.IUpdatePermission,
      },
    );
  typia.assert(updatedRole);
  // 5. Verify permissions were completely cleared and role identity preserved
  TestValidator.equals("role ID preserved", updatedRole.id, customRole.id);
  TestValidator.equals(
    "permissions cleared",
    updatedRole.permissions.length,
    0,
  );
  // 6. Verify role remains valid and can have permissions added later
  const readdedRole =
    await api.functional.hrmPlatform.member.roles.permissions.updatePermissions(
      memberConnection,
      {
        roleId: customRole.id,
        body: {
          permissions: ["report:view"],
        } satisfies IHrmPlatformRole.IUpdatePermission,
      },
    );
  typia.assert(readdedRole);
  TestValidator.equals(
    "permission readded successfully",
    readdedRole.permissions.length,
    1,
  );
  TestValidator.equals(
    "correct permission code",
    readdedRole.permissions[0]!.permission,
    "report:view",
  );
}
