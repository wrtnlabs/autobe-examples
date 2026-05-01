import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that the permissions list endpoint returns all nine predefined system
 * permissions when called without any search filters.
 *
 * Verifies that the complete permission catalog is returned when the request
 * body contains no search criteria. The test validates both the pagination
 * metadata (confirming exactly nine records) and confirms that every expected
 * permission key from the fixed catalog is present in the response.
 *
 * 1. Calls the permissions list endpoint with an empty request body to retrieve
 *    the full catalog without text filtering.
 * 2. Validates pagination metadata shows records=9 and the data array contains
 *    exactly nine entries.
 * 3. Verifies all nine fixed permission keys are present in the response:
 *    org:manage, employee:manage, employee:view, project:manage, project:view,
 *    time:manage, time:approve, time:view_all, and report:view.
 */
export async function test_api_permissions_list_all_without_filters(
  connection: api.IConnection,
): Promise<void> {
  const result = await api.functional.erpHrm.permissions.index(connection, {
    body: {} satisfies IErpHrmPermission.IRequest,
  });
  typia.assert(result);
  const expectedKeys = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ];
  TestValidator.equals("records count", result.pagination.records, 9);
  TestValidator.equals("data length", result.data.length, 9);
  const actualKeys = result.data.map((p) => p.key).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  TestValidator.equals(
    "all expected permission keys present",
    actualKeys,
    sortedExpectedKeys,
  );
}
