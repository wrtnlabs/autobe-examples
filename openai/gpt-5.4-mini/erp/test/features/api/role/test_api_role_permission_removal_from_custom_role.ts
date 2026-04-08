import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
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

export async function test_api_role_permission_removal_from_custom_role(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Aa!!",
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const role = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ArrayUtil.repeat(1, () =>
          typia.random<IErpHrmTimePermission.ISummary>(),
        ),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role);
  TestValidator.predicate(
    "created role should be persisted",
    role.id.length > 0,
  );
  TestValidator.predicate(
    "created role should have at least one permission",
    role.permissions.length > 0,
  );
  const permission = role.permissions[0];
  typia.assert(permission);
  await TestValidator.error(
    "removing a role permission without a valid assignment id should fail",
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.erase(
        memberConnection,
        {
          roleId: role.id,
          rolePermissionId: permission.id,
        },
      );
    },
  );
}
