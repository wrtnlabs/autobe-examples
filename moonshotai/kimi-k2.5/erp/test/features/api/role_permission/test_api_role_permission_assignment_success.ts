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

export async function test_api_role_permission_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. Generate a role ID for permission assignment
  // Note: In full implementation, this role would be created via organization setup
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Assign permission to the role using the utility function
  const permission =
    await generate_random_erp_hrm_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId },
        body: {
          permission: "project.manage",
        },
      },
    );
  // 4. Validate complete response structure
  typia.assert(permission);
  // 5. Verify business logic - permission assignment correctness
  TestValidator.equals(
    "permission identifier matches",
    permission.permission,
    "project.manage",
  );
  TestValidator.equals("role reference matches", permission.roleId, roleId);
  TestValidator.predicate(
    "permission is active",
    permission.deletedAt === null,
  );
}
