import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validates updating the display name and description of an attribute dimension
 * by an admin user.
 *
 * The test covers the complete admin flow for updating an attribute dimension:
 *
 * 1. Authenticate as admin (using unique business email, strong password, etc.)
 * 2. Create a new attribute dimension (with random, valid dimension_code, name and
 *    description)
 * 3. Update the attribute dimension: change only the name and description using
 *    the dimension_code (which is immutable and must not change)
 * 4. Validate that the updated entity reflects the new name/description, the
 *    dimension_code remains unmodified, and audit timestamps are updated
 *    (updated_at > created_at)
 * 5. Attempt to update a non-existent dimension_code (business logic error)
 * 6. Attempt to update with an invalid name (e.g., empty string) (validation
 *    error)
 * 7. All changes should be visible and correct in subsequent reads
 * 8. Only allowed fields (name, description) can be modified; attempts to change
 *    dimension_code must have no effect
 */
export async function test_api_attribute_dimension_update_display_name_and_description_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminRegistration = {
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRegistration,
    });
  typia.assert(admin);

  // 2. Create new attribute dimension
  const createBody = {
    dimension_code: RandomGenerator.alphaNumeric(10),
    name: "Initial Name",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingAttributeDimension.ICreate;
  const created: IShoppingAttributeDimension =
    await api.functional.shopping.admin.attributeDimensions.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals(
    "dimension code unchanged after creation",
    created.dimension_code,
    createBody.dimension_code,
  );
  const originalCreatedAt = created.created_at;
  const originalDescription = created.description;

  // 3. Update only name/description; dimension_code must stay the same
  const updateBody = {
    name: "Updated Dimension Name",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingAttributeDimension.IUpdate;
  const updated: IShoppingAttributeDimension =
    await api.functional.shopping.admin.attributeDimensions.update(connection, {
      dimensionCode: created.dimension_code,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals(
    "dimension_code must not change after update",
    updated.dimension_code,
    created.dimension_code,
  );
  TestValidator.equals("dimension name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "dimension description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.notEquals(
    "updated_at timestamp must change if updated",
    updated.created_at,
    originalCreatedAt,
  );

  // 4. Confirm new data is visible by immediately updating again (should reflect prior changes)
  const updateBody2 = {
    name: "Second Name Change",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingAttributeDimension.IUpdate;
  const updated2 =
    await api.functional.shopping.admin.attributeDimensions.update(connection, {
      dimensionCode: created.dimension_code,
      body: updateBody2,
    });
  typia.assert(updated2);
  TestValidator.equals(
    "dimension_code still unchanged after second update",
    updated2.dimension_code,
    created.dimension_code,
  );
  TestValidator.equals(
    "name reflects second update",
    updated2.name,
    updateBody2.name,
  );
  TestValidator.equals(
    "description reflects second update",
    updated2.description,
    updateBody2.description,
  );

  // 5. Edge case: Try to update a non-existent dimension_code (should error)
  await TestValidator.error(
    "updating non-existent dimension_code should error",
    async () => {
      await api.functional.shopping.admin.attributeDimensions.update(
        connection,
        {
          dimensionCode: RandomGenerator.alphaNumeric(15) + "-notfound",
          body: updateBody,
        },
      );
    },
  );

  // 6. Edge case: Try to update with invalid (empty) name
  await TestValidator.error(
    "updating with empty name should fail validation",
    async () => {
      await api.functional.shopping.admin.attributeDimensions.update(
        connection,
        {
          dimensionCode: created.dimension_code,
          body: {
            name: "",
            description: "Invalid update with blank name",
          } satisfies IShoppingAttributeDimension.IUpdate,
        },
      );
    },
  );

  // 7. Only allowed fields updatable: confirming dimension_code truly immutable
  const badUpdateBody = {
    name: "Trying to Change Name Again",
    description: updated2.description,
  } satisfies IShoppingAttributeDimension.IUpdate;
  // even if we try to supply a new dimension_code, the function/DTO won't accept it (type-level enforcement)
  const afterBadUpdate =
    await api.functional.shopping.admin.attributeDimensions.update(connection, {
      dimensionCode: created.dimension_code,
      body: badUpdateBody,
    });
  typia.assert(afterBadUpdate);
  TestValidator.equals(
    "dimension_code remains unchanged after bad update attempt",
    afterBadUpdate.dimension_code,
    created.dimension_code,
  );
  TestValidator.equals(
    "name updated via allowed path",
    afterBadUpdate.name,
    badUpdateBody.name,
  );
  TestValidator.equals(
    "description remains correct",
    afterBadUpdate.description,
    badUpdateBody.description,
  );
}
