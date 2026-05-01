import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test that renaming a custom role to a built-in role's name is rejected.
 *
 * Validates the name uniqueness constraint spans both custom and built-in roles within an organization. When a custom role is created and then an attempt is made to rename it to a built-in role name (e.g., "Manager"), the system must reject the update since the built-in role already occupies that name.
 *
 * 1. Create a custom role with a unique random name via the role creation utility.
 * 2. Attempt to rename the custom role to "Manager" (a built-in role name).
 * 3. Verify the update is rejected with an error due to name conflict.
 * 4. Confirm the custom role's original name remains preserved.
 */
export async function test_api_role_update_name_conflict_with_builtin(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  // 1. Create a custom role with a unique name
  const customRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {},
  );
  typia.assert(customRole);
  const originalName = customRole.name;
  // 2. Attempt to rename the custom role to a built-in role name
  await TestValidator.error(
    "rename custom role to built-in role name must fail",
    async () => {
      await api.functional.erpHrm.roles.update(ownerConnection, {
        roleId: customRole.id,
        body: {
          name: "Manager",
        } satisfies IErpHrmRole.IUpdate,
      });
    },
  );
  // 3. Verify the custom role's original name is preserved
  TestValidator.equals(
    "custom role name preserved",
    customRole.name,
    originalName,
  );
}
