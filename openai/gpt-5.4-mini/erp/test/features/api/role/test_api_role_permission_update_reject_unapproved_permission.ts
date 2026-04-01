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
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";
import { prepare_random_erp_hrm_time_role_permission } from "../../../prepare/prepare_random_erp_hrm_time_role_permission";

export async function test_api_role_permission_update_reject_unapproved_permission(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmTimeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(authorized);
  const roleConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const role: IErpHrmTimeRole =
    await generate_random_erp_hrm_time_member_roles_create(roleConnection, {
      body: {
        name: `role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: `approved:${RandomGenerator.alphabets(6)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      } satisfies IErpHrmTimeRole.ICreate,
    });
  typia.assert(role);
  const originalPermissions: IErpHrmTimePermission.ISummary[] =
    role.permissions;
  const approvedPermission: IErpHrmTimePermission.ISummary | undefined =
    originalPermissions[0];
  const unapprovedPermission: IErpHrmTimePermission.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    key: `unapproved:${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IErpHrmTimePermission.ISummary;
  const request: IErpHrmTimeRole.IUpdate = {
    rolePermissions: approvedPermission
      ? [
          { erpHrmTimePermissionId: approvedPermission.id },
          { erpHrmTimePermissionId: unapprovedPermission.id },
        ]
      : [{ erpHrmTimePermissionId: unapprovedPermission.id }],
  };
  await TestValidator.error(
    "reject role permission update with unapproved permission",
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.update(
        roleConnection,
        {
          roleId: role.id,
          body: request,
        },
      );
    },
  );
  const response: IErpHrmTimeRole =
    await api.functional.erpHrmTime.member.roles.permissions.update(
      roleConnection,
      {
        roleId: role.id,
        body: {
          rolePermissions: originalPermissions.map((permission) => ({
            erpHrmTimePermissionId: permission.id,
          })),
        } satisfies IErpHrmTimeRole.IUpdate,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "stored role permissions remain unchanged",
    response.permissions,
    originalPermissions,
  );
}
