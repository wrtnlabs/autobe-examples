import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimePermission";
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

export async function test_api_role_permissions_add_approved_permissions_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/auth/member/join",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const permissionPage =
    await api.functional.erpHrmTime.member.permissions.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimePermission.IRequest,
    });
  typia.assert(permissionPage);
  TestValidator.predicate(
    "permission catalog should contain approved permissions",
    permissionPage.data.length > 0,
  );
  const selectedPermissions = permissionPage.data.slice(
    0,
    Math.min(permissionPage.data.length, 2),
  );
  TestValidator.predicate(
    "at least one approved permission must be available",
    selectedPermissions.length > 0,
  );
  const role = await api.functional.erpHrmTime.member.roles.create(
    memberConnection,
    {
      body: {
        name: `role_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: selectedPermissions,
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role);
  const permissionKeys = selectedPermissions.map(
    (permission) => permission.key,
  );
  const duplicatedKeys = [...permissionKeys, permissionKeys[0]];
  const updated =
    await api.functional.erpHrmTime.member.roles.permissions.create(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissionKeys: duplicatedKeys,
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("role id preserved", updated.id, role.id);
  TestValidator.equals("role name preserved", updated.name, role.name);
  TestValidator.equals(
    "role description preserved",
    updated.description,
    role.description,
  );
  TestValidator.equals(
    "role organization preserved",
    updated.organization,
    role.organization,
  );
  TestValidator.predicate("role should not be built in", !updated.isBuiltin);
  TestValidator.predicate(
    "updated role should contain all assigned permission keys",
    permissionKeys.every((key) =>
      updated.permissions.some((permission) => permission.key === key),
    ),
  );
  TestValidator.predicate(
    "updated role should deduplicate permissions",
    new Set(updated.permissions.map((permission) => permission.key)).size ===
      updated.permissions.length,
  );
}
