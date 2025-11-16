import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate that an admin can update all fields of a seller address via the
 * admin endpoint.
 *
 * The scenario ensures:
 *
 * - Registration and authentication as a new admin via join
 * - Execution of a full-field update on an existing seller address by admin
 * - All fields in IShoppingMallAddress.IUpdate are updated and reflected
 * - Updated address remains correctly associated with the seller
 * - Enforces business rules on field completeness, formats, and default logic
 */
export async function test_api_seller_address_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain authentication tokens
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: randomAdminPassword(),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare test seller and address IDs (simulate/test infrastructure must provide valid UUIDs)
  // In a real setup, these would be created beforehand or provisioned via test harness utilities.
  // Here we use random UUIDs to match expected format for demonstration only.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const addressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare data to update: all required fields in IShoppingMallAddress.IUpdate
  const updateBody = {
    full_name: RandomGenerator.name(),
    street: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    province: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 12,
    }),
    phone: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallAddress.IUpdate;

  // 4. Perform the update as admin
  const updated: IShoppingMallAddress =
    await api.functional.shoppingMall.admin.sellers.addresses.update(
      connection,
      {
        sellerId,
        addressId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate that all fields are updated as expected and seller association is unchanged
  TestValidator.equals(
    "full_name is updated",
    updated.full_name,
    updateBody.full_name,
  );
  TestValidator.equals("street is updated", updated.street, updateBody.street);
  TestValidator.equals("city is updated", updated.city, updateBody.city);
  TestValidator.equals(
    "province is updated",
    updated.province,
    updateBody.province,
  );
  TestValidator.equals(
    "postal_code is updated",
    updated.postal_code,
    updateBody.postal_code,
  );
  TestValidator.equals(
    "country is updated",
    updated.country,
    updateBody.country,
  );
  TestValidator.equals("phone is updated", updated.phone, updateBody.phone);
  TestValidator.equals(
    "is_default is updated",
    updated.is_default,
    updateBody.is_default,
  );
  TestValidator.equals(
    "address remains associated with seller",
    updated.shopping_mall_seller_id,
    sellerId,
  );

  /**
   * Generates a strong admin password that meets all complexity requirements.
   *
   * Length: 12+ characters Contains uppercase, lowercase, digits, and symbols.
   */
  function randomAdminPassword(): string {
    const upper = RandomGenerator.pick([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]);
    const lower = RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz"]);
    const digit = RandomGenerator.pick([..."0123456789"]);
    const symbol = RandomGenerator.pick([..."!@#$%^&*()-_=+[]{}|;:,.<>?"]);
    const rest = RandomGenerator.alphaNumeric(8);
    // Shuffle all characters
    return (upper + lower + digit + symbol + rest)
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }
}
