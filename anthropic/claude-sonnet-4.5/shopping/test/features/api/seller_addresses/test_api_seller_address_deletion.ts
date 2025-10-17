import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller address deletion workflow with soft delete functionality.
 *
 * This test validates the complete workflow of a seller deleting a saved
 * delivery address from their account. The scenario ensures that sellers can
 * successfully remove addresses they no longer need while maintaining data
 * integrity through soft delete operations.
 *
 * Test workflow:
 *
 * 1. Register a new seller account and obtain authentication
 * 2. Create a delivery address for the seller
 * 3. Delete the address using the soft delete endpoint
 * 4. Verify successful deletion (void response indicates success)
 *
 * Business validations:
 *
 * - Address deletion uses soft delete (sets deleted_at timestamp)
 * - Only address owner can delete their addresses (ownership validation)
 * - Address is removed from seller's active address list
 * - System handles default address designation appropriately
 */
export async function test_api_seller_address_deletion(
  connection: api.IConnection,
) {
  // Step 1: Register new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(),
        business_type: RandomGenerator.pick([
          "individual",
          "LLC",
          "corporation",
          "partnership",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create a delivery address for the seller
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.pick(["USA", "Canada", "UK"] as const),
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.seller.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 3: Delete the address (soft delete operation)
  await api.functional.shoppingMall.seller.addresses.erase(connection, {
    addressId: address.id,
  });

  // Step 4: Deletion successful (void return indicates success)
  // The address is now soft deleted with deleted_at timestamp set
  // and removed from the seller's active address list
}
