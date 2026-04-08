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

export async function test_api_role_permissions_reject_builtin_role_update(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const loadedRole = await api.functional.erpHrmTime.member.roles.at(
    memberConnection,
    {
      roleId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(loadedRole);
  TestValidator.predicate("role is built-in", loadedRole.isBuiltin);
  const originalPermissions = loadedRole.permissions.slice();
  const candidatePermissionKeys = ["org:manage"];
  await TestValidator.error(
    "built-in role permission update rejected",
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.create(
        memberConnection,
        {
          roleId: loadedRole.id,
          body: {
            permissionKeys: candidatePermissionKeys,
          } satisfies IErpHrmTimeRolePermission.ICreate,
        },
      );
    },
  );
  const afterRole = await api.functional.erpHrmTime.member.roles.at(
    memberConnection,
    {
      roleId: loadedRole.id,
    },
  );
  typia.assert(afterRole);
  TestValidator.equals(
    "built-in role permissions unchanged",
    afterRole.permissions,
    originalPermissions,
  );
}
