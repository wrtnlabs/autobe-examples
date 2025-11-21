import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive seller registration workflow for e-commerce merchant
 * accounts. Verify creation of seller profiles with business information,
 * contact details, and initial verification status. Validate that seller
 * accounts receive appropriate authentication tokens and marketplace
 * permissions. Test that registration includes proper business verification
 * requirements and sellers can access marketplace features immediately after
 * registration.
 */
export async function test_api_seller_registration_standard(
  connection: api.IConnection,
) {
  // Generate valid business registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(3),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    tax_id: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile("02"),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  // Test successful seller registration
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });
  typia.assert(sellerAuth);

  // Validate returned seller authorization includes all required fields
  TestValidator.predicate(
    "seller has valid ID",
    sellerAuth.id !== null && sellerAuth.id !== undefined,
  );
  TestValidator.equals(
    "seller email matches registration",
    sellerAuth.email,
    registrationData.email,
  );
  TestValidator.equals(
    "seller business name matches registration",
    sellerAuth.business_name,
    registrationData.business_name,
  );
  TestValidator.equals(
    "seller business registration number matches",
    sellerAuth.business_registration_number,
    registrationData.business_registration_number,
  );
  TestValidator.equals(
    "seller tax ID matches registration",
    sellerAuth.tax_id,
    registrationData.tax_id,
  );
  TestValidator.equals(
    "seller phone matches registration",
    sellerAuth.phone,
    registrationData.phone,
  );
  TestValidator.equals(
    "seller business type matches registration",
    sellerAuth.business_type,
    registrationData.business_type,
  );

  // Validate seller authorization metadata
  TestValidator.predicate(
    "seller has verification status",
    sellerAuth.verification_status !== null &&
      sellerAuth.verification_status !== undefined,
  );
  TestValidator.predicate(
    "seller has commission rate",
    sellerAuth.commission_rate !== null &&
      sellerAuth.commission_rate !== undefined,
  );
  TestValidator.predicate(
    "seller has valid created_at timestamp",
    sellerAuth.created_at !== null && sellerAuth.created_at !== undefined,
  );
  TestValidator.predicate(
    "seller has valid updated_at timestamp",
    sellerAuth.updated_at !== null && sellerAuth.updated_at !== undefined,
  );

  // Validate authentication token
  TestValidator.predicate(
    "seller has valid authorization token",
    sellerAuth.token !== null && sellerAuth.token !== undefined,
  );
  TestValidator.predicate(
    "token has access string",
    sellerAuth.token.access !== null && sellerAuth.token.access !== undefined,
  );
  TestValidator.predicate(
    "token has refresh string",
    sellerAuth.token.refresh !== null && sellerAuth.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "token has expiration timestamp",
    sellerAuth.token.expired_at !== null &&
      sellerAuth.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token has refreshable_until timestamp",
    sellerAuth.token.refreshable_until !== null &&
      sellerAuth.token.refreshable_until !== undefined,
  );

  // Validate verification status
  TestValidator.predicate(
    "seller has is_verified boolean",
    typeof sellerAuth.is_verified === "boolean",
  );

  // Test duplicate registration should fail
  await TestValidator.error(
    "duplicate seller registration should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: registrationData,
      });
    },
  );

  // Test registration with different business types
  const businessTypes = [
    "sole proprietorship",
    "partnership",
    "limited liability company",
    "corporation",
  ] as const;

  for (const businessType of businessTypes) {
    const uniqueRegistration = {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: RandomGenerator.name(3),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile("032"),
      business_type: businessType,
    } satisfies IShoppingMallSeller.IJoin;

    const sellerAuthOfType: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: uniqueRegistration,
      });
    typia.assert(sellerAuthOfType);

    TestValidator.equals(
      `seller business type ${businessType} is correctly set`,
      sellerAuthOfType.business_type,
      businessType,
    );
  }
}
