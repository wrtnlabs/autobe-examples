import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_validation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create an existing role 'Developer' with permissions
  const roleName = "Developer";
  const existingRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: roleName,
        permissions: [
          "employee:view",
          "project:view",
        ] satisfies IErpHrmRole.ICreate["permissions"],
      },
    },
  );
  typia.assert(existingRole);
  // 3. Validate the same role name - should return isValid: false
  const validationResult = await api.functional.erpHrm.admin.roles.validate(
    adminConnection,
    {
      body: {
        name: roleName,
      } satisfies IErpHrmRole.IValidationRequest,
    },
  );
  typia.assert(validationResult);
  // 4. Verify validation result
  TestValidator.equals(
    "isValid should be false",
    validationResult.isValid,
    false,
  );
  TestValidator.predicate(
    "errors array should not be empty",
    validationResult.errors.length > 0,
  );
  TestValidator.predicate(
    "error message should indicate duplicate exists",
    validationResult.errors.some(
      (error) =>
        error.toLowerCase().includes("already exists") ||
        error.toLowerCase().includes("duplicate"),
    ),
  );
}