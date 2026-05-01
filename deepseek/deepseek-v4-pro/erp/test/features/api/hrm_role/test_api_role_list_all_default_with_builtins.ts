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
 * Verify the default role listing returns all roles with correct pagination.
 *
 * Tests the default behavior of PATCH /erpHrm/roles when called with an empty
 * request body. Confirms that the response includes proper pagination metadata,
 * contains the three built-in roles (Owner, Manager, Employee) with is_builtin:
 * true, and returns results sorted by name ascending.
 *
 * 1. Call PATCH /erpHrm/roles with an empty request body to trigger default
 *    pagination, no filters, and default name-ascending sort.
 * 2. Validate pagination metadata: current page is 1, limit/records/pages are
 *    non-negative.
 * 3. Verify the three built-in roles — Owner, Manager, Employee — are present
 *    with is_builtin: true.
 * 4. Verify all roles in the data array are sorted by name ascending (A-Z).
 */
export async function test_api_role_list_all_default_with_builtins(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call with empty request body — default pagination, no filters
  const output = await api.functional.erpHrm.roles.index(connection, {
    body: {} satisfies IErpHrmRole.IRequest,
  });
  typia.assert(output);
  // 2. Pagination metadata validation
  TestValidator.equals(
    "current page defaults to 1",
    output.pagination.current,
    1,
  );
  TestValidator.predicate("limit is positive", output.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    output.pagination.pages >= 0,
  );
  // 3. Built-in roles must be present
  const builtinRoles = output.data.filter((role) => role.is_builtin);
  TestValidator.predicate(
    "at least 3 built-in roles exist",
    builtinRoles.length >= 3,
  );
  const builtinNames = builtinRoles.map((role) => role.name);
  TestValidator.predicate(
    "Owner built-in role present",
    builtinNames.includes("Owner"),
  );
  TestValidator.predicate(
    "Manager built-in role present",
    builtinNames.includes("Manager"),
  );
  TestValidator.predicate(
    "Employee built-in role present",
    builtinNames.includes("Employee"),
  );
  // 4. Default sort order: name ascending (A-Z)
  for (let i = 1; i < output.data.length; i++) {
    TestValidator.predicate(
      `name ascending: "${output.data[i - 1].name}" <= "${output.data[i].name}"`,
      output.data[i - 1].name.localeCompare(output.data[i].name) <= 0,
    );
  }
}
