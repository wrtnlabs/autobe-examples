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

export async function test_api_role_permission_update_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const roleConnection: api.IConnection = { host: connection.host };
  roleConnection.headers = {
    Authorization: joined.token.access,
  };
  const createdRole = await api.functional.erpHrmTime.member.roles.create(
    roleConnection,
    {
      body: {
        name: `role_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(createdRole);
  const updatedRole =
    await api.functional.erpHrmTime.member.roles.permissions.update(
      roleConnection,
      {
        roleId: createdRole.id,
        body: {
          rolePermissions: [],
        } satisfies IErpHrmTimeRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  TestValidator.equals("role id preserved", updatedRole.id, createdRole.id);
  TestValidator.equals(
    "role name preserved",
    updatedRole.name,
    createdRole.name,
  );
  TestValidator.equals(
    "role organization preserved",
    updatedRole.organization,
    createdRole.organization,
  );
  TestValidator.equals(
    "role builtin flag preserved",
    updatedRole.isBuiltin,
    createdRole.isBuiltin,
  );
  TestValidator.equals(
    "role createdAt preserved",
    updatedRole.createdAt,
    createdRole.createdAt,
  );
  TestValidator.equals(
    "role deletedAt preserved",
    updatedRole.deletedAt,
    createdRole.deletedAt,
  );
  TestValidator.equals(
    "permissions replaced with requested empty set",
    updatedRole.permissions,
    [],
  );
}
