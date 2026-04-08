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

export async function test_api_role_permission_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const createdRole =
    await generate_random_erp_hrm_time_member_roles_permissions_create(
      memberAuthConnection,
      {
        params: { roleId },
        body: {
          permissionKeys: [RandomGenerator.alphabets(12)],
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(createdRole);
  TestValidator.equals("role id is preserved", createdRole.id, roleId);
  TestValidator.equals(
    "role permissions list is present",
    Array.isArray(createdRole.permissions),
    true,
  );
  await TestValidator.error(
    "detail lookup requires a valid role-permission association id",
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.at(
        memberAuthConnection,
        {
          roleId: createdRole.id,
          rolePermissionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
