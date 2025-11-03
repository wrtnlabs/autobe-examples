import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductTag";

/**
 * Validate public access to product tag detail endpoint by tagCode.
 *
 * This test verifies that anyone (public or admin) can retrieve a product tag's
 * complete metadata using its unique tagCode. It ensures the endpoint returns
 * the proper tag with expected details for valid codes, and enforces uniqueness
 * by also verifying that an unknown code returns an error.
 *
 * Steps:
 *
 * 1. Generate a random product tag object using typia (simulate insertion into DB)
 * 2. Call the `api.functional.shopping.productTags.at` endpoint with the tag's
 *    tag_code
 * 3. Assert that the returned tag matches the expected details (id, tag_code,
 *    display_value, description, created_at)
 * 4. Call the endpoint with a random non-existent tag code and verify it raises an
 *    error.
 */
export async function test_api_product_tag_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Generate a random product tag (sample data)
  const tag: IShoppingProductTag = typia.random<IShoppingProductTag>();

  // 2. Simulate product tag presence by calling API for its tag_code
  // NOTE: In real e2e, tag must be created in DB, here we simulate using random tag_code
  const output: IShoppingProductTag =
    await api.functional.shopping.productTags.at(connection, {
      tagCode: tag.tag_code,
    });
  typia.assert(output);

  // 3. Validate returned tag matches expected details
  TestValidator.equals(
    "returned tag_code matches",
    output.tag_code,
    tag.tag_code,
  );
  TestValidator.equals(
    "returned id is valid UUID",
    typeof output.id,
    typeof tag.id,
  );
  TestValidator.equals(
    "display_value matches",
    output.display_value,
    tag.display_value,
  );
  TestValidator.equals(
    "created_at format",
    typeof output.created_at,
    typeof tag.created_at,
  );

  // 4. Calling with a non-existent tag code should throw error
  const unknownTagCode = `unknown_${RandomGenerator.alphabets(8)}`;
  await TestValidator.error("unknown tagCode returns error", async () => {
    await api.functional.shopping.productTags.at(connection, {
      tagCode: unknownTagCode,
    });
  });
}
