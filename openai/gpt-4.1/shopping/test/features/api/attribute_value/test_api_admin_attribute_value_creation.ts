import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validates creation of attribute values by an authenticated admin within a
 * specific attribute dimension.
 *
 * The test covers:
 *
 * 1. Admin registration & login via /auth/admin/join, required for catalog
 *    management.
 * 2. Creating a unique dimension code for testing.
 * 3. Creating the first attribute value under this dimension.
 * 4. Testing rejection of duplicate value_code within the same dimension (should
 *    fail).
 * 5. Successful creation of a second, distinct value_code under the same
 *    dimension.
 * 6. Verifying both unique values appear and are correct for downstream workflows.
 */
export async function test_api_admin_attribute_value_creation(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick(["super", "operator", "support"] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare a unique attribute dimension code
  // For testing we use a random code because the API expects an existing dimension.
  // In real scenarios, there should be a dimension create API, but since only value creation API is given,
  // we'll simulate a dimension code for isolation.
  const dimensionCode = RandomGenerator.alphaNumeric(10);

  // 3. Create a new value under this dimension
  const valueCode1 = RandomGenerator.alphabets(8);
  const valueBody1 = {
    value_code: valueCode1,
    display_value: RandomGenerator.name(1),
    display_order: 1,
    description: "First attribute value.",
  } satisfies IShoppingAttributeValue.ICreate;

  const created1 =
    await api.functional.shopping.admin.attributeDimensions.values.create(
      connection,
      {
        dimensionCode: dimensionCode,
        body: valueBody1,
      },
    );
  typia.assert(created1);
  TestValidator.equals(
    "created attribute value code matches input",
    created1.value_code,
    valueBody1.value_code,
  );
  TestValidator.equals(
    "created attribute value display value",
    created1.display_value,
    valueBody1.display_value,
  );
  TestValidator.equals(
    "created attribute value display order",
    created1.display_order,
    valueBody1.display_order,
  );
  TestValidator.equals(
    "created attribute value description",
    created1.description,
    valueBody1.description,
  );
  TestValidator.equals(
    "attribute value assigned dimension code",
    created1.shopping_attribute_dimension_id !== undefined &&
      created1.shopping_attribute_dimension_id !== null,
    true,
  );

  // 4. Attempt to create duplicate value_code (should fail)
  await TestValidator.error("duplicate value_code should fail", async () => {
    await api.functional.shopping.admin.attributeDimensions.values.create(
      connection,
      {
        dimensionCode: dimensionCode,
        body: valueBody1,
      },
    );
  });

  // 5. Create a second, distinct attribute value under same dimension
  const valueCode2 = RandomGenerator.alphabets(8);
  const valueBody2 = {
    value_code: valueCode2,
    display_value: RandomGenerator.name(1),
    display_order: 2,
    description: "Second attribute value.",
  } satisfies IShoppingAttributeValue.ICreate;

  const created2 =
    await api.functional.shopping.admin.attributeDimensions.values.create(
      connection,
      {
        dimensionCode: dimensionCode,
        body: valueBody2,
      },
    );
  typia.assert(created2);
  TestValidator.equals(
    "second attribute value code",
    created2.value_code,
    valueBody2.value_code,
  );

  // 6. Optionally, verify both values have distinct ids and display values
  TestValidator.notEquals(
    "attribute values have different value_codes",
    created1.value_code,
    created2.value_code,
  );
  TestValidator.notEquals(
    "attribute values have different ids",
    created1.id,
    created2.id,
  );
}
