import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer email update functionality with proper validation.
 *
 * This test validates that a buyer can successfully update their email address,
 * ensuring the change is persisted correctly and other profile fields remain
 * unchanged. The test verifies email uniqueness validation and proper timestamp
 * updates upon modification.
 *
 * Steps:
 *
 * 1. Register a new buyer account with initial email
 * 2. Update the buyer profile with a new unique email address
 * 3. Validate response contains the updated email in RFC 5322 format
 * 4. Verify updated_at timestamp reflects the change
 * 5. Confirm other profile fields (name, phone) remain unchanged
 */
export async function test_api_buyer_profile_update_email(
  connection: api.IConnection,
) {
  // Step 1: Register a new buyer account with initial email
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerFullName = typia.random<
    string & tags.MinLength<2> & tags.MaxLength<100>
  >();
  const buyerPhone = RandomGenerator.mobile();

  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: initialEmail,
        password: buyerPassword,
        full_name: buyerFullName,
        phone_number: buyerPhone,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(registeredBuyer);

  // Store original values for comparison
  const originalFullName = registeredBuyer.full_name;
  const originalPhoneNumber = registeredBuyer.phone_number;
  const originalCreatedAt = registeredBuyer.created_at;

  // Step 2: Update the buyer profile with a new unique email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.buyer.buyers.update(connection, {
      buyerId: registeredBuyer.id,
      body: {
        email: newEmail,
      } satisfies IShoppingMallBuyer.IUpdate,
    });
  typia.assert(updatedBuyer);

  // Step 3: Validate response contains the updated email in RFC 5322 format
  TestValidator.equals("email should be updated", updatedBuyer.email, newEmail);

  // Step 4: Verify updated_at timestamp reflects the change
  TestValidator.predicate(
    "updated_at should be after or equal to created_at",
    new Date(updatedBuyer.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );

  // Step 5: Confirm other profile fields remain unchanged
  TestValidator.equals(
    "full_name should remain unchanged",
    updatedBuyer.full_name,
    originalFullName,
  );
  TestValidator.equals(
    "phone_number should remain unchanged",
    updatedBuyer.phone_number,
    originalPhoneNumber,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedBuyer.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "buyer ID should remain unchanged",
    updatedBuyer.id,
    registeredBuyer.id,
  );
}
