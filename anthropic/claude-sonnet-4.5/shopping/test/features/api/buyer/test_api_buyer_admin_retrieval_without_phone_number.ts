import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test admin retrieval of buyer account without phone number.
 *
 * This test validates that an administrator can successfully retrieve buyer
 * account information when the buyer registered without providing a phone
 * number, ensuring that nullable phone_number fields are correctly handled.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as admin
 * 2. Create a buyer account without phone number
 * 3. Retrieve the buyer account as admin
 * 4. Validate phone_number is null
 * 5. Verify all other required fields are valid
 */
export async function test_api_buyer_admin_retrieval_without_phone_number(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a buyer account WITHOUT phone number
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerData = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: null,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 3: Retrieve the buyer account as admin
  const retrievedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.at(connection, {
      buyerId: buyer.id,
    });
  typia.assert(retrievedBuyer);

  // Step 4: Validate that phone_number is null
  TestValidator.equals(
    "phone_number should be null",
    retrievedBuyer.phone_number,
    null,
  );

  // Step 5: Verify all other required fields match expected values
  TestValidator.equals("buyer ID matches", retrievedBuyer.id, buyer.id);
  TestValidator.equals("buyer email matches", retrievedBuyer.email, buyerEmail);
  TestValidator.equals(
    "buyer full_name matches",
    retrievedBuyer.full_name,
    buyerData.full_name,
  );
  TestValidator.equals(
    "buyer email_verified matches",
    retrievedBuyer.email_verified,
    buyer.email_verified,
  );
}
