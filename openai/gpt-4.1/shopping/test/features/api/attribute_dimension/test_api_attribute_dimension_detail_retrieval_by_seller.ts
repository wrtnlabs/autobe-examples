import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate seller-retrievable attribute dimension details by dimension_code.
 *
 * 1. Register an admin account (used for dimension creation).
 * 2. Register a seller account (used for detail retrieval test).
 * 3. As admin, create a new attribute dimension (unique dimension_code, name,
 *    description).
 * 4. Authenticate as seller and retrieve dimension details by dimension_code.
 * 5. Assert all details are correct and match what was created.
 * 6. Try to retrieve an unknown dimension_code and validate error handling
 *    (not-found scenario).
 * 7. Skips deletion/inactive dimension check due to API limitations.
 */
export async function test_api_attribute_dimension_detail_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminOutput: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(2),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(adminOutput);

  // 2. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const sellerOutput: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(2),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(sellerOutput);

  // 3. As admin, create new attribute dimension
  const dimensionCode = RandomGenerator.alphabets(8).toLowerCase();
  const dimensionName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 9,
  });
  const dimensionDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });
  // Switch to admin - already authenticated
  const dimension: IShoppingAttributeDimension =
    await api.functional.shopping.admin.attributeDimensions.create(connection, {
      body: {
        dimension_code: dimensionCode,
        name: dimensionName,
        description: dimensionDescription,
      } satisfies IShoppingAttributeDimension.ICreate,
    });
  typia.assert(dimension);

  // 4. Authenticate as seller
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: sellerOutput.display_name,
      contact_phone: sellerOutput.contact_phone,
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  // 5. Retrieve dimension as seller
  const found: IShoppingAttributeDimension =
    await api.functional.shopping.seller.attributeDimensions.at(connection, {
      dimensionCode: dimensionCode,
    });
  typia.assert(found);
  TestValidator.equals(
    "dimension_code matches",
    found.dimension_code,
    dimensionCode,
  );
  TestValidator.equals("name matches", found.name, dimensionName);
  TestValidator.equals(
    "description matches",
    found.description,
    dimensionDescription,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof found.created_at === "string" && found.created_at.length > 0,
  );

  // 6. Attempt to retrieve non-existent dimension_code as seller (should error)
  const nonexistentCode = `${dimensionCode}_notfound`;
  await TestValidator.error(
    "not-found error for unknown dimension_code",
    async () => {
      await api.functional.shopping.seller.attributeDimensions.at(connection, {
        dimensionCode: nonexistentCode,
      });
    },
  );
}
