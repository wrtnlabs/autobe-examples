import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test successful creation of a new product attribute dimension by an admin.
 *
 * This test simulates an admin account registering on the platform, then
 * creating a new attribute dimension (e.g. 'color', 'size'). It verifies that
 * the creation endpoint accepts a valid full payload (dimension_code, name,
 * description), returns all expected fields, and the created dimension is valid
 * for further catalog use.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin with valid credentials (onboards a unique
 *    email, password, etc.).
 * 2. The authenticated admin creates an attribute dimension by providing
 *    dimension_code, name, and description.
 * 3. The response is asserted to contain all required fields per schema and
 *    matches the creation input.
 * 4. The created dimension can be referenced for future product variant use (as
 *    indicated by valid response).
 */
export async function test_api_admin_create_attribute_dimension_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a new attribute dimension
  const dimensionInput = {
    dimension_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 6,
      wordMax: 15,
    }),
  } satisfies IShoppingAttributeDimension.ICreate;

  const created: IShoppingAttributeDimension =
    await api.functional.shopping.admin.attributeDimensions.create(connection, {
      body: dimensionInput,
    });
  typia.assert(created);

  // Step 3: Assert created dimension business fields match input
  TestValidator.equals(
    "dimension_code matches input",
    created.dimension_code,
    dimensionInput.dimension_code,
  );
  TestValidator.equals("name matches input", created.name, dimensionInput.name);
  TestValidator.equals(
    "description matches input",
    created.description,
    dimensionInput.description,
  );

  // Step 4: The created dimension is ready for referencing in other flows
}
