import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that an administrator can retrieve buyer accounts containing optional
 * phone number data.
 *
 * This test validates that nullable phone_number field is properly handled in
 * the response when a buyer registers with a phone number included. It ensures
 * administrators can access complete buyer information for customer support and
 * delivery coordination purposes.
 *
 * Steps:
 *
 * 1. Create admin account via join for authorization
 * 2. Create a buyer account via join with phone number included in registration
 * 3. Retrieve the buyer account as admin using the buyer ID
 * 4. Validate that the phone_number field is present in the response and matches
 *    the provided value
 * 5. Verify that the phone number includes country code format
 * 6. Confirm all other buyer fields are correctly populated
 */
export async function test_api_buyer_admin_retrieval_with_phone_number(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminRequestBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRequestBody,
    });
  typia.assert(admin);

  // Step 2: Create a buyer account with phone number
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPhoneNumber = RandomGenerator.mobile();
  const buyerRequestBody = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: buyerPhoneNumber,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerRequestBody,
    });
  typia.assert(buyer);

  // Step 3: Retrieve the buyer account as admin using the buyer ID
  const retrievedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.at(connection, {
      buyerId: buyer.id,
    });
  typia.assert(retrievedBuyer);

  // Step 4: Validate that the phone_number field is present and matches
  TestValidator.predicate(
    "phone_number should be present",
    retrievedBuyer.phone_number !== null &&
      retrievedBuyer.phone_number !== undefined,
  );

  TestValidator.equals(
    "phone_number should match the registered value",
    retrievedBuyer.phone_number,
    buyerPhoneNumber,
  );

  // Step 5: Verify that the phone number includes country code format
  TestValidator.predicate(
    "phone_number should start with country code format",
    retrievedBuyer.phone_number!.startsWith("0") ||
      retrievedBuyer.phone_number!.startsWith("+"),
  );

  // Step 6: Confirm all other buyer fields are correctly populated
  TestValidator.equals("buyer ID should match", retrievedBuyer.id, buyer.id);
  TestValidator.equals(
    "buyer email should match",
    retrievedBuyer.email,
    buyerEmail,
  );
  TestValidator.equals(
    "buyer full_name should match",
    retrievedBuyer.full_name,
    buyerRequestBody.full_name,
  );
}
