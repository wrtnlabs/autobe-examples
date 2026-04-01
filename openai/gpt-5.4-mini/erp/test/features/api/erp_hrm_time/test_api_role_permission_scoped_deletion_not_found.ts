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

export async function test_api_role_permission_scoped_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  const roleA = await generate_random_erp_hrm_time_member_roles_create(
    authorizedConnection,
    {
      body: {
        name: `role-a-${RandomGenerator.alphabets(6)}`,
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(roleA);
  const roleB = await generate_random_erp_hrm_time_member_roles_create(
    authorizedConnection,
    {
      body: {
        name: `role-b-${RandomGenerator.alphabets(6)}`,
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(roleB);
  const permission = typia.random<IErpHrmTimePermission.ISummary>();
  const assignment =
    await generate_random_erp_hrm_time_member_roles_permissions_create(
      authorizedConnection,
      {
        params: { roleId: roleA.id },
        body: {
          erpHrmTimePermissionId: permission.id,
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(assignment);
  await TestValidator.httpError(
    "deleting a permission through the wrong role context should fail",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.erase(
        authorizedConnection,
        {
          roleId: roleB.id,
          rolePermissionId: assignment.id,
        },
      );
    },
  );
  const verification = await api.functional.erpHrmTime.member.roles.create(
    authorizedConnection,
    {
      body: {
        name: `verify-${RandomGenerator.alphabets(6)}`,
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(verification);
  TestValidator.notEquals(
    "wrong-context deletion should not affect the original role's permission assignment",
    roleA.id,
    roleB.id,
  );
}
