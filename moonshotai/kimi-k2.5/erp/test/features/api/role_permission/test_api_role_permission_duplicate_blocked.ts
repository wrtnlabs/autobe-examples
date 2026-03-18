import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_member_roles_permissions_create";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_permission_duplicate_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create first permission assignment to a role
  // Note: Assumes organization and role exist. In production, these would be
  // created via organization and role management endpoints prior to this test.
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const permission = "organization.manage";
  const firstAssignment =
    await generate_random_erp_hrm_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId },
        body: { permission } satisfies IErpHrmRolePermission.ICreate,
      },
    );
  typia.assert(firstAssignment);
  TestValidator.equals(
    "permission matches input",
    firstAssignment.permission,
    permission,
  );
  // 3. Attempt to assign the exact same permission again - should be rejected
  await TestValidator.error(
    "duplicate permission assignment should be blocked with conflict error",
    async () => {
      await api.functional.erpHrm.member.roles.permissions.create(
        memberConnection,
        {
          roleId,
          body: { permission } satisfies IErpHrmRolePermission.ICreate,
        },
      );
    },
  );
}
