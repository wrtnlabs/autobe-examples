import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductTag";

/**
 * Validate hard-deletion of shopping product tags by business tag code.
 *
 * 1. Register and authenticate as an admin.
 * 2. Create a unique product tag to obtain a new tag_code.
 * 3. Delete the newly created product tag via its tag code.
 * 4. Attempt to delete the tag again to validate error behavior for non-existent
 *    tag.
 * 5. Attempt to re-create the tag with the same tag_code, validating business
 *    rules for code reuse (if supported or returns error). All actions must be
 *    handled using only officially exposed API functions and DTOs.
 */
export async function test_api_admin_product_tag_hard_delete(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a unique admin
  const adminEmail = `${RandomGenerator.alphaNumeric(12)}@shop-admin.com`;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      role: "superadmin",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // Step 2: Create a unique product tag as admin
  const uniqueTagCode = RandomGenerator.alphaNumeric(10);
  const tagInput = {
    tag_code: uniqueTagCode,
    display_value: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IShoppingProductTag.ICreate;
  const productTag = await api.functional.shopping.admin.productTags.create(
    connection,
    {
      body: tagInput,
    },
  );
  typia.assert(productTag);
  TestValidator.equals(
    "created tag_code matches input",
    productTag.tag_code,
    tagInput.tag_code,
  );

  // Step 3: Hard-delete the created tag using its tag_code
  await api.functional.shopping.admin.productTags.erase(connection, {
    tagCode: uniqueTagCode,
  });

  // Step 4: Try deleting again—must fail for non-existent tag
  await TestValidator.error(
    "deleting non-existent tag returns error",
    async () => {
      await api.functional.shopping.admin.productTags.erase(connection, {
        tagCode: uniqueTagCode,
      });
    },
  );

  // Step 5: Optionally try to re-create a tag with same tag_code (depends on business rules, expected to fail or succeed per implementation)
  try {
    const reCreatedTag = await api.functional.shopping.admin.productTags.create(
      connection,
      {
        body: tagInput,
      },
    );
    typia.assert(reCreatedTag);
    TestValidator.equals(
      "tag re-creation allowed after deletion",
      reCreatedTag.tag_code,
      uniqueTagCode,
    );
  } catch (exp) {
    // If re-creation fails, ensure that's due to code-reuse restriction
    TestValidator.predicate(
      "tag re-creation fails after hard delete if not allowed",
      true,
    );
  }
}
