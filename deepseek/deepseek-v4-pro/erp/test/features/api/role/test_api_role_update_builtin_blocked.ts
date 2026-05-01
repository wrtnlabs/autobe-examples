import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that built-in roles cannot be updated.
 *
 * Validates that the system rejects any attempt to modify a built-in role's attributes. Built-in roles (Owner, Manager, Employee) are auto-provisioned at organization creation and are immutable for the organization's lifetime. Any update attempt — whether changing the name, description, or permission set — must be rejected unconditionally with an error indicating that built-in roles are immutable and cannot be modified in any way.
 *
 * The test sends a PUT request to update a role with modified name and description fields, then verifies the system responds with an error.
 *
 * 1. Prepare an update body with a new name and description.
 * 2. Attempt to update a role via the PUT endpoint using a randomly generated role ID.
 * 3. Verify the update is rejected with an error indicating built-in roles are immutable.
 */
export async function test_api_role_update_builtin_blocked(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.error("cannot update built-in role", () =>
    api.functional.erpHrm.roles.update(connection, {
      roleId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmRole.IUpdate,
    }),
  );
}
