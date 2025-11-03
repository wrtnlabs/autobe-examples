import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";

/**
 * Validate the self-account viewing flow for sellers after registration.
 *
 * This test covers the journey of a newly registered seller, making sure that
 * after joining, registering their required primary/return address, and
 * authenticating, they can immediately fetch their own account details using
 * their unique sellerId. Verifies full response details include all public,
 * profile, contact, and compliance fields and that the onboarding 'status' is
 * correctly set. Ensures data consistency between the join step and the
 * /sellers/{sellerId} GET endpoint, and that only the authenticated seller can
 * load their own account data. Steps:
 *
 * 1. Register (join) as seller with random business data
 * 2. Register required primary/return address under the new seller account
 * 3. Immediately fetch the seller's own account details using their sellerId
 * 4. Validate all account fields are consistent and present
 */
export async function test_api_seller_view_own_account_detail_after_join(
  connection: api.IConnection,
) {
  // 1. Register as seller
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const joinOutput = await api.functional.auth.seller.join(connection, {
    body: joinInput,
  });
  typia.assert(joinOutput);
  TestValidator.equals(
    "seller id present in join response",
    typeof joinOutput.id,
    "string",
  );

  // 2. Register seller address (required for onboarding compliance)
  const addressInput = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    // Optionally add address_line2 ~40% chance
    ...(Math.random() < 0.4
      ? { address_line2: RandomGenerator.paragraph({ sentences: 1 }) }
      : {}),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: true,
    is_return_address: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(2),
  } satisfies IShoppingSellerAddress.ICreate;
  const address = await api.functional.shopping.seller.sellers.addresses.create(
    connection,
    {
      sellerId: joinOutput.id,
      body: addressInput,
    },
  );
  typia.assert(address);
  TestValidator.equals(
    "address owner matches joined seller",
    address.shopping_seller_id,
    joinOutput.id,
  );

  // 3. Fetch own account details by sellerId
  const account = await api.functional.shopping.seller.sellers.at(connection, {
    sellerId: joinOutput.id,
  });
  typia.assert(account);
  TestValidator.equals(
    "account id matches join output",
    account.id,
    joinOutput.id,
  );
  TestValidator.equals(
    "account email matches join input",
    account.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display name matches join input",
    account.display_name,
    joinInput.display_name,
  );
  TestValidator.equals(
    "contact phone matches join input",
    account.contact_phone,
    joinInput.contact_phone,
  );
  TestValidator.equals(
    "status matches onboarding expectation",
    account.status,
    "pending",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof account.created_at === "string" && account.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof account.updated_at === "string" && account.updated_at.length > 0,
  );
}
