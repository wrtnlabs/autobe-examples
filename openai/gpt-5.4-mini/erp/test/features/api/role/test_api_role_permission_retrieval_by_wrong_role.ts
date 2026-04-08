import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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
import { generate_random_erp_hrm_time_member_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_permissions_create";
import { prepare_random_erp_hrm_time_role_permission } from "../../../prepare/prepare_random_erp_hrm_time_role_permission";

export async function test_api_role_permission_retrieval_by_wrong_role(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: `http://localhost/${RandomGenerator.alphabets(8)}`,
      referrer: `http://localhost/${RandomGenerator.alphabets(8)}`,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const sourceRoleId = typia.random<string & tags.Format<"uuid">>();
  const wrongRoleId = typia.random<string & tags.Format<"uuid">>();
  const updatedRole =
    await generate_random_erp_hrm_time_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId: sourceRoleId },
        body: {
          permissionKeys: ["project:view"],
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(updatedRole);
  TestValidator.predicate(
    "source role should include assigned permissions",
    updatedRole.permissions.length > 0,
  );
  const permission = updatedRole.permissions[0];
  TestValidator.predicate(
    "assigned permission should exist before wrong-role lookup",
    permission !== undefined,
  );
  if (permission === undefined) return;
  await TestValidator.httpError(
    "retrieving a role permission through the wrong parent role should fail",
    404,
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.at(
        memberConnection,
        {
          roleId: wrongRoleId,
          rolePermissionId: permission.id,
        },
      );
    },
  );
}
