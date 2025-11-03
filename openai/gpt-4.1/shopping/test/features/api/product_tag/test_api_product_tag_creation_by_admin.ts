import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductTag";

/**
 * Test the complete workflow for creating a new product tag by an admin.
 *
 * 1. Register and authenticate as a new admin.
 * 2. Create a product tag using unique tag_code and verify the response metadata.
 * 3. Attempt to create another tag with the same tag_code and expect a failure
 *    (uniqueness enforcement).
 */
export async function test_api_product_tag_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(10)}@business.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a unique product tag
  const tagCode = RandomGenerator.alphaNumeric(10);
  const tagCreateBody = {
    tag_code: tagCode,
    display_value: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 12,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IShoppingProductTag.ICreate;
  const createdTag: IShoppingProductTag =
    await api.functional.shopping.admin.productTags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert(createdTag);
  // Validate that returned metadata matches input
  TestValidator.equals(
    "returned tag_code matches input",
    createdTag.tag_code,
    tagCreateBody.tag_code,
  );
  TestValidator.equals(
    "returned display_value matches input",
    createdTag.display_value,
    tagCreateBody.display_value,
  );
  TestValidator.equals(
    "returned description matches input",
    createdTag.description,
    tagCreateBody.description,
  );

  // 3. Attempt to create another tag with the same tag_code -- should fail
  await TestValidator.error("duplicate tag_code creation fails", async () => {
    await api.functional.shopping.admin.productTags.create(connection, {
      body: {
        tag_code: tagCode,
        display_value: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 12,
        }),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IShoppingProductTag.ICreate,
    });
  });
}
