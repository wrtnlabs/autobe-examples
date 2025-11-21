import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration rejection when email address is already associated
 * with an existing seller account. Validates that duplicate email addresses
 * trigger appropriate error responses preventing account creation.
 */
export async function test_api_seller_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email address that we'll use for the first seller
  const testEmail = typia.random<string & tags.Format<"email">>();

  // First, register a seller with the test email address
  const initialSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: testEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(initialSeller);

  // Generate the same seller registration data but attempt to register again
  const duplicatedBody = {
    email: testEmail, // Same email address
    business_name: RandomGenerator.name(2),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile("010"),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  // Verify that attempting to register with the same email fails
  await TestValidator.error(
    "duplicate email should fail seller registration",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: duplicatedBody,
      });
    },
  );

  // Verify all fields are preserved in the initial seller data
  TestValidator.equals(
    "email should match initial registration",
    initialSeller.email,
    testEmail,
  );
  TestValidator.predicate(
    "seller should be authorized after registration",
    initialSeller.token !== undefined,
  );
}
