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

export async function test_api_role_custom_update_permissions(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/join" as string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" as string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const createdRole = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(createdRole);
  const permissionIds = createdRole.permissions
    .slice(0, 2)
    .map((permission) => ({
      erpHrmTimePermissionId: permission.id,
    }));
  TestValidator.predicate(
    "role has permissions to replace",
    permissionIds.length > 0,
  );
  const updateBody = {
    name: `updated-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rolePermissions: permissionIds.length > 0 ? permissionIds : undefined,
  } satisfies IErpHrmTimeRole.IUpdate;
  const updatedRole = await api.functional.erpHrmTime.member.roles.update(
    memberConnection,
    {
      roleId: createdRole.id,
      body: updateBody,
    },
  );
  typia.assert(updatedRole);
  TestValidator.equals("updated role id", updatedRole.id, createdRole.id);
  TestValidator.equals(
    "organization is preserved",
    updatedRole.organization,
    createdRole.organization,
  );
  TestValidator.equals("role name updated", updatedRole.name, updateBody.name);
  TestValidator.equals(
    "role description updated",
    updatedRole.description,
    updateBody.description,
  );
  TestValidator.predicate(
    "role remains custom",
    updatedRole.isBuiltin === false,
  );
  TestValidator.equals(
    "permissions replaced exactly",
    updatedRole.permissions.map((permission) => permission.id),
    permissionIds.map((permission) => permission.erpHrmTimePermissionId),
  );
}
