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

export async function test_api_role_permission_assignment_removal(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joined.token.access },
  };
  const createdRole = await api.functional.erpHrmTime.member.roles.create(
    memberAuthConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(createdRole);
  TestValidator.predicate(
    "created role belongs to the selected organization",
    createdRole.organization !== null && createdRole.organization !== undefined,
  );
  TestValidator.predicate(
    "created role is usable and initially has no permissions or a valid permission list",
    Array.isArray(createdRole.permissions),
  );
  const permission: IErpHrmTimePermission.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    key: `custom:${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const rolePermission =
    await api.functional.erpHrmTime.member.roles.permissions.create(
      memberAuthConnection,
      {
        roleId: createdRole.id,
        body: {
          erpHrmTimePermissionId: permission.id,
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(rolePermission);
  TestValidator.equals(
    "attached permission matches requested permission",
    rolePermission.permission.id,
    permission.id,
  );
  await api.functional.erpHrmTime.member.roles.permissions.erase(
    memberAuthConnection,
    {
      roleId: createdRole.id,
      rolePermissionId: rolePermission.id,
    },
  );
  TestValidator.predicate(
    "deleted role-permission association is removed from the role's effective permissions",
    !createdRole.permissions.some((item) => item.id === permission.id),
  );
}
