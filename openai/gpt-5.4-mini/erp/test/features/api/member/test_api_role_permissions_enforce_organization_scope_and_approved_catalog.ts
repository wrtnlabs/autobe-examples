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
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { generate_random_erp_hrm_time_member_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_permissions_create";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";
import { prepare_random_erp_hrm_time_role_permission } from "../../../prepare/prepare_random_erp_hrm_time_role_permission";

export async function test_api_role_permissions_enforce_organization_scope_and_approved_catalog(
  connection: api.IConnection,
): Promise<void> {
  const authorized: IErpHrmTimeMember.IAuthorized = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        displayName: RandomGenerator.name(),
        href: "https://example.com/erpHrmTime/onboarding",
        referrer: "https://example.com/",
        avatarImageUrl: null,
        phoneNumber: RandomGenerator.mobile(),
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const role = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:view",
            description: "View employee information",
          },
        ],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role);
  const initialKeys = role.permissions
    .map((permission) => permission.key)
    .sort();
  TestValidator.predicate(
    "created role should contain the initial approved permission",
    () => initialKeys.includes("employee:view"),
  );
  await TestValidator.error(
    "unapproved permission keys should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.create(
        memberConnection,
        {
          roleId: role.id,
          body: {
            permissionKeys: ["not:approved"],
          } satisfies IErpHrmTimeRolePermission.ICreate,
        },
      );
    },
  );
  const afterInvalidAttempt =
    await api.functional.erpHrmTime.member.roles.permissions.create(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissionKeys: ["employee:view", "time:view_all"],
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(afterInvalidAttempt);
  const finalKeys = afterInvalidAttempt.permissions
    .map((permission) => permission.key)
    .sort();
  TestValidator.predicate(
    "approved permissions should be assigned to the role",
    () =>
      finalKeys.includes("employee:view") &&
      finalKeys.includes("time:view_all"),
  );
  TestValidator.equals(
    "role should not duplicate permission assignments",
    finalKeys.length,
    new Set(finalKeys).size,
  );
}
