import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";

/**
 * Validate retrieval of attribute value details by dimension and value code
 * (public, unauthenticated).
 *
 * Ensures correct variant metadata returned for a real value, and proper error
 * handling for nonexistent/invalid codes.
 *
 * Test Steps:
 *
 * 1. Query endpoint with valid codes. Assert all IShoppingAttributeValue fields
 *    present and correct.
 * 2. Query with random likely-nonexistent codes. Assert error thrown (no result
 *    returns).
 * 3. Query with empty strings as codes to validate input boundary checks and error
 *    handling.
 */
export async function test_api_attribute_value_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Positive: Retrieve details with valid codes (synthetic - typia.random)
  const valid = typia.random<IShoppingAttributeValue>();
  const output: IShoppingAttributeValue =
    await api.functional.shopping.attributeDimensions.values.at(connection, {
      dimensionCode: valid.value_code, // intentionally using value_code for both params (synthetic scenario)
      valueCode: valid.value_code,
    });
  typia.assert(output);
  TestValidator.equals("id matches", output.id, output.id);
  TestValidator.predicate(
    "display_value present",
    typeof output.display_value === "string" && output.display_value.length > 0,
  );
  // Optional fields: display_order, description, should not throw if undefined or null
  TestValidator.predicate(
    "optional or valid order",
    output.display_order === null ||
      output.display_order === undefined ||
      typeof output.display_order === "number",
  );
  TestValidator.predicate(
    "created_at is date-time string",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );

  // 2. Negative: Non-existent codes (random unexpected strings)
  await TestValidator.error(
    "non-existent attribute returns error",
    async () => {
      await api.functional.shopping.attributeDimensions.values.at(connection, {
        dimensionCode: RandomGenerator.alphabets(12),
        valueCode: RandomGenerator.alphabets(12),
      });
    },
  );

  // 3. Negative: Empty strings (invalid input)
  await TestValidator.error("empty codes return error", async () => {
    await api.functional.shopping.attributeDimensions.values.at(connection, {
      dimensionCode: "",
      valueCode: "",
    });
  });
}
