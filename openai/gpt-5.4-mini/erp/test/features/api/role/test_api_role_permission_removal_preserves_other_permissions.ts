import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { generate_random_erp_hrm_time_member_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_permissions_create";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";
import { prepare_random_erp_hrm_time_role_permission } from "../../../prepare/prepare_random_erp_hrm_time_role_permission";

export async function test_api_role_permission_removal_preserves_other_permissions(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const role = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `custom-role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role);
  TestValidator.predicate("custom role is not built-in", !role.isBuiltin);
  const permissionOne =
    await generate_random_erp_hrm_time_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId: role.id },
        body: {
          erpHrmTimePermissionId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(permissionOne);
  const permissionTwo =
    await generate_random_erp_hrm_time_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId: role.id },
        body: {
          erpHrmTimePermissionId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(permissionTwo);
  TestValidator.notEquals(
    "role permission records should be distinct",
    permissionOne.id,
    permissionTwo.id,
  );
  TestValidator.notEquals(
    "role permission targets should be distinct",
    permissionOne.permission.id,
    permissionTwo.permission.id,
  );
  await api.functional.erpHrmTime.member.roles.permissions.erase(
    memberConnection,
    {
      roleId: role.id,
      rolePermissionId: permissionOne.id,
    },
  );
  TestValidator.equals(
    "remaining permission assignment is preserved",
    permissionTwo.permission.id,
    permissionTwo.permission.id,
  );
  await TestValidator.error(
    "removing the same role permission twice should fail",
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.erase(
        memberConnection,
        {
          roleId: role.id,
          rolePermissionId: permissionOne.id,
        },
      );
    },
  );
}
