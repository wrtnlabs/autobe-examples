import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member and their first organization (owner with org:manage permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create a custom role for deletion testing
  const roleName = `Team Lead ${RandomGenerator.alphaNumeric(8)}`;
  const createdRole = await api.functional.erpHrm.member.roles.create(
    memberConnection,
    {
      body: {
        name: roleName,
        permissions: ["employee:view", "project:view"],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(createdRole);
  // Verify the created role is a custom role (not built-in)
  TestValidator.equals(
    "is_builtin should be false",
    createdRole.is_builtin,
    false,
  );
  TestValidator.equals("role name matches", createdRole.name, roleName);
  TestValidator.predicate(
    "permissions include employee:view",
    createdRole.permissions.includes("employee:view"),
  );
  TestValidator.predicate(
    "permissions include project:view",
    createdRole.permissions.includes("project:view"),
  );
  const roleId = createdRole.id;
  // 3. Test: Delete the custom role
  await api.functional.erpHrm.member.roles.erase(memberConnection, {
    roleId: roleId,
  });
  // 4. Verify: Attempting to delete the same role again should return 404
  await TestValidator.httpError(
    "deleted role should return 404",
    404,
    async () => {
      await api.functional.erpHrm.member.roles.erase(memberConnection, {
        roleId: roleId,
      });
    },
  );
}
