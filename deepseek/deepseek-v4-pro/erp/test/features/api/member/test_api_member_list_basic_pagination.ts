import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test basic pagination for listing members in the current organization.
 *
 * Validates the default pagination behavior of the member listing endpoint when no filters, search criteria, or custom pagination parameters are provided. The endpoint should return the first page with up to 20 members sorted alphabetically by display name in ascending order from A to Z.
 *
 * Special attention is given to verifying that pagination metadata is computed correctly—current page reflects the default page 1, the limit matches the default of 20, total records is a non-negative count, and total pages equals the ceiling of records divided by limit. The data array must never contain more entries than the limit allows.
 *
 * 1. Call the members listing endpoint with an empty request body using all default parameter values.
 * 2. Assert the complete response structure with typia.assert to validate all field types and nullable constraints.
 * 3. Verify pagination metadata: current page is 1, limit is 20, records is non-negative, pages equals ceil(records / limit).
 * 4. Confirm the data array does not exceed the limit count.
 * 5. Iterate through consecutive members to verify display_name values are sorted alphabetically in ascending order.
 */
export async function test_api_member_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  const result = await api.functional.erpHrm.members.index(connection, {
    body: {} satisfies IErpHrmMember.IRequest,
  });
  typia.assert(result);
  const { pagination, data } = result;
  TestValidator.equals("current page", pagination.current, 1);
  TestValidator.equals("limit", pagination.limit, 20);
  TestValidator.predicate("records non-negative", pagination.records >= 0);
  TestValidator.equals(
    "total pages calculation",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  TestValidator.predicate(
    "data count within limit",
    data.length <= pagination.limit,
  );
  for (let i = 1; i < data.length; i++) {
    TestValidator.predicate(
      `display_name ascending at index ${i}`,
      data[i - 1].display_name.localeCompare(data[i].display_name) <= 0,
    );
  }
}
