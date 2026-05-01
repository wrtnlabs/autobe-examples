import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Verify the is_builtin boolean filter correctly separates built-in roles from custom roles.
 *
 * Validates that the PATCH /erpHrm/roles endpoint correctly filters roles based on the is_builtin flag. Built-in roles (Owner, Manager, Employee) are provisioned automatically at organization creation and are immutable, while custom roles are created by organization owners. The filter must accurately separate these two categories without cross-contamination.
 *
 * 1. Request roles with is_builtin set to true, verifying only the three built-in roles (Owner, Manager, Employee) are returned, each with is_builtin set to true.
 * 2. Request roles with is_builtin set to false, verifying only custom roles are returned, each with is_builtin set to false, and no built-in role names appear in the results.
 * 3. Request roles without the is_builtin filter, verifying both built-in and custom roles are returned together in a single result set.
 */
export async function test_api_role_filter_by_builtin_status(
  connection: api.IConnection,
): Promise<void> {
  const builtInNames = ["Owner", "Manager", "Employee"] as const;
  // 1. Filter by built-in roles only
  const builtinResult = await api.functional.erpHrm.roles.index(connection, {
    body: { is_builtin: true } satisfies IErpHrmRole.IRequest,
  });
  typia.assert(builtinResult);
  TestValidator.predicate(
    "all returned roles are built-in",
    builtinResult.data.every((role) => role.is_builtin),
  );
  TestValidator.equals(
    "exactly three built-in roles",
    builtinResult.data.length,
    3,
  );
  TestValidator.predicate("all three built-in role names present", () =>
    builtInNames.every((name) =>
      builtinResult.data.some((role) => role.name === name),
    ),
  );
  // 2. Filter by custom roles only
  const customResult = await api.functional.erpHrm.roles.index(connection, {
    body: { is_builtin: false } satisfies IErpHrmRole.IRequest,
  });
  typia.assert(customResult);
  TestValidator.predicate(
    "all returned roles are custom",
    customResult.data.every((role) => !role.is_builtin),
  );
  TestValidator.predicate("no built-in role names in custom results", () =>
    builtInNames.every(
      (name) => !customResult.data.some((role) => role.name === name),
    ),
  );
  // 3. No filter — both built-in and custom roles returned together
  const allResult = await api.functional.erpHrm.roles.index(connection, {
    body: {} satisfies IErpHrmRole.IRequest,
  });
  typia.assert(allResult);
  const hasBuiltin = allResult.data.some((role) => role.is_builtin);
  const hasCustom = allResult.data.some((role) => !role.is_builtin);
  TestValidator.predicate(
    "both built-in and custom roles returned",
    hasBuiltin && hasCustom,
  );
}
