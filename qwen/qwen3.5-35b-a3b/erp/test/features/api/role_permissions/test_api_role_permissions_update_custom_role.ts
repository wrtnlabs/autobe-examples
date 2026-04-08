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

export async function test_api_role_permissions_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create custom role using the authenticated member connection
  const authenticatedConnection = { ...memberConnection, Authorization: memberAuth.token.access };
  const role = await generate_random_hrm_platform_member_roles_create(
    authenticatedConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        role_kind: "custom",
      },
    },
  );
  typia.assert(role);
  // 3. Verify initial permissions are empty
  TestValidator.equals("initial permissions empty", role.permissions.length, 0);
  // 4. Define valid permission codes for update
  const newPermissions = [
    "employee.view",
    "employee.manage",
    "project.manage",
    "timesheet.approve",
    "report.generate",
  ];
  // 5. Update role permissions
  const updatedRole =
    await api.functional.hrmPlatform.member.roles.permissions.update(
      authenticatedConnection,
      {
        roleId: role.id,
        body: {
          permissions: newPermissions,
        } satisfies IHrmPlatformRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // 6. Verify permissions were updated correctly
  TestValidator.equals(
    "permissions count updated",
    updatedRole.permissions.length,
    newPermissions.length,
  );
  // 7. Verify each permission code exists and follows dot-notation
  for (const permission of updatedRole.permissions) {
    TestValidator.predicate(
      `permission code valid format: ${permission.code}`,
      /^[a-z0-9]+(?:\.[a-z0-9]+)+$/.test(permission.code),
    );
  }
  // 8. Verify all submitted permissions are present in response
  const permissionCodes = updatedRole.permissions.map((p) => p.code);
  for (const code of newPermissions) {
    TestValidator.equals(
      `permission ${code} exists`,
      permissionCodes.includes(code),
      true,
    );
  }
  // 9. Verify role name and description remain unchanged
  TestValidator.equals("role name unchanged", updatedRole.name, role.name);
  TestValidator.equals(
    "role description unchanged",
    updatedRole.description,
    role.description,
  );
  // 10. Verify role kind remains custom
  TestValidator.equals(
    "role kind remains custom",
    updatedRole.role_kind,
    "custom",
  );
}