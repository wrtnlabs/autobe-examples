import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that an administrator can retrieve buyer accounts and correctly see
 * email verification status.
 *
 * This test validates that the email_verified flag is accurately reflected in
 * the retrieved buyer data. Administrators need to see email verification
 * status for customer support and account management purposes.
 *
 * Steps:
 *
 * 1. Create a new admin account via join for admin authorization
 * 2. Create a buyer account via join (which sets email_verified to false
 *    initially)
 * 3. Retrieve the buyer account as admin
 * 4. Validate that email_verified field is present and set to false
 * 5. Verify that all other account fields are correctly populated
 */
export async function test_api_buyer_admin_retrieval_with_verified_email(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
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
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create a buyer account
  const buyerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerCreateData,
    });
  typia.assert(buyer);

  // Step 3: Retrieve the buyer account as admin
  const retrievedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.at(connection, {
      buyerId: buyer.id,
    });
  typia.assert(retrievedBuyer);

  // Step 4: Validate that email_verified field is present and set to false
  TestValidator.equals(
    "email_verified field should be false for newly created buyer",
    retrievedBuyer.email_verified,
    false,
  );

  // Step 5: Verify that all other account fields are correctly populated
  TestValidator.equals("buyer ID should match", retrievedBuyer.id, buyer.id);

  TestValidator.equals(
    "buyer email should match",
    retrievedBuyer.email,
    buyerCreateData.email,
  );

  TestValidator.equals(
    "buyer full_name should match",
    retrievedBuyer.full_name,
    buyerCreateData.full_name,
  );

  TestValidator.equals(
    "buyer phone_number should match",
    retrievedBuyer.phone_number,
    buyerCreateData.phone_number,
  );

  TestValidator.predicate(
    "created_at should be a valid date-time",
    retrievedBuyer.created_at !== null &&
      retrievedBuyer.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at should be a valid date-time",
    retrievedBuyer.updated_at !== null &&
      retrievedBuyer.updated_at !== undefined,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for active account",
    retrievedBuyer.deleted_at === null ||
      retrievedBuyer.deleted_at === undefined,
  );
}
