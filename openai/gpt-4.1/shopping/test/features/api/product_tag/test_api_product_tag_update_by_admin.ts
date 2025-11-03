import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductTag";

/**
 * Validate updating an existing product tag's display value and description by
 * an admin.
 *
 * This test ensures an admin is able to successfully update product tag
 * metadata and covers three main checks:
 *
 * 1. Happy-path update (allowed fields change, tag_code remains immutable)
 * 2. Attempt to duplicate an existing display_value (should fail uniqueness
 *    validation)
 * 3. Confirm tag final state after all operations
 * 4. Register (join) a new admin account to ensure authorization.
 * 5. Create a new product tag (to act as the update target) and another product
 *    tag (for duplicate display_value test)
 * 6. Happy-path update: update the target tag's display_value and description to
 *    new unique values and verify changes.
 * 7. Attempt to change display_value to a value already used by another tag
 *    (should fail with validation error).
 * 8. Check final state of the tag to confirm only allowed fields were changed and
 *    database reflects updates as expected.
 */
export async function test_api_product_tag_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register/authenticate as admin
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@company.com";
  const adminPassword = RandomGenerator.alphaNumeric(15);
  const adminName = RandomGenerator.name();
  const adminRole = "super";
  const adminStatus = "active";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: adminRole,
      status: adminStatus,
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // Step 2: Create two product tags (to test uniqueness in display_value)
  const baseTagCode = RandomGenerator.alphaNumeric(8);
  const targetTagInput = {
    tag_code: baseTagCode,
    display_value: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingProductTag.ICreate;
  const targetTag = await api.functional.shopping.admin.productTags.create(
    connection,
    {
      body: targetTagInput,
    },
  );
  typia.assert(targetTag);
  TestValidator.equals(
    "target tag display_value matches input",
    targetTag.display_value,
    targetTagInput.display_value,
  );

  const duplicateDisplayValue = RandomGenerator.paragraph({ sentences: 2 });
  const secondTag = await api.functional.shopping.admin.productTags.create(
    connection,
    {
      body: {
        tag_code: RandomGenerator.alphaNumeric(8),
        display_value: duplicateDisplayValue,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingProductTag.ICreate,
    },
  );
  typia.assert(secondTag);

  // Step 3: Happy-path update: update display_value and description
  const updatedDisplayValue = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 8 });
  const updatedTag = await api.functional.shopping.admin.productTags.update(
    connection,
    {
      tagCode: targetTag.tag_code,
      body: {
        display_value: updatedDisplayValue,
        description: updatedDescription,
      } satisfies IShoppingProductTag.IUpdate,
    },
  );
  typia.assert(updatedTag);
  TestValidator.equals(
    "updated tag display_value matches input",
    updatedTag.display_value,
    updatedDisplayValue,
  );
  TestValidator.equals(
    "updated tag description matches input",
    updatedTag.description,
    updatedDescription,
  );
  TestValidator.equals("tag id unchanged", updatedTag.id, targetTag.id);
  TestValidator.equals(
    "tag_code unchanged after update",
    updatedTag.tag_code,
    targetTag.tag_code,
  );

  // Step 4: Attempt to change display_value to a duplicate value (violating uniqueness)
  await TestValidator.error(
    "duplicate display_value should not be allowed",
    async () => {
      await api.functional.shopping.admin.productTags.update(connection, {
        tagCode: targetTag.tag_code,
        body: {
          display_value: duplicateDisplayValue,
        } satisfies IShoppingProductTag.IUpdate,
      });
    },
  );

  // Step 5: Confirm tag state
  const finalTag = await api.functional.shopping.admin.productTags.update(
    connection,
    {
      tagCode: targetTag.tag_code,
      body: {} satisfies IShoppingProductTag.IUpdate,
    },
  );
  typia.assert(finalTag);
  TestValidator.equals(
    "final tag display_value matches last successful update",
    finalTag.display_value,
    updatedDisplayValue,
  );
  TestValidator.equals(
    "final tag description matches last successful update",
    finalTag.description,
    updatedDescription,
  );
  TestValidator.equals(
    "tag_code remains original",
    finalTag.tag_code,
    targetTag.tag_code,
  );
}
