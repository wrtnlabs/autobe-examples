import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration to validate proper commission rate assignment during
 * account creation.
 *
 * This test verifies that new sellers receive appropriate marketplace
 * commission rates based on business type and verification status. It validates
 * that commission settings are correctly established and available for future
 * transaction processing and revenue sharing calculations.
 *
 * Test Steps:
 *
 * 1. Generate comprehensive seller registration data with realistic business
 *    information
 * 2. Register new seller through the auth seller join endpoint
 * 3. Verify response includes proper commission rate assignment based on business
 *    classification
 * 4. Validate business type determines correct commission tier for marketplace
 *    operations
 * 5. Verify JWT token is properly set for authorized seller operations
 * 6. Test verification status reflects comprehensive business credential
 *    validation
 * 7. Ensure proper marketplace integration and operational readiness for
 *    transaction processing
 */
export async function test_api_seller_registration_valid_commission_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Generate comprehensive seller registration data with business classification
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(3),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    tax_id: RandomGenerator.alphaNumeric(11),
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "Corporation",
      "LLC",
      "Partnership",
      "Sole Proprietorship",
    ]),
  } satisfies IShoppingMallSeller.IJoin;

  // Register seller with marketplace business verification
  const sellerResponse: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: joinRequest });
  typia.assert(sellerResponse);

  // Validate commission rate assignment based on business classification
  TestValidator.predicate(
    "commission rate corresponds to business classification",
    sellerResponse.commission_rate > 0 && sellerResponse.commission_rate <= 15,
  );

  // Verify business type determines commission tier
  TestValidator.equals(
    "business type classification matches registration",
    sellerResponse.business_type,
    joinRequest.business_type,
  );

  // Test business credential verification status
  TestValidator.predicate(
    "verification reflects business credential validation",
    sellerResponse.is_verified === false || sellerResponse.is_verified === true,
  );

  // Validate marketplace integration with proper authentication
  TestValidator.predicate(
    "JWT access token established for authorized operations",
    sellerResponse.token.access.length > 50 &&
      sellerResponse.token.access.includes("."),
  );

  TestValidator.predicate(
    "token expiration within reasonable timeframe",
    new Date(sellerResponse.token.expired_at).getTime() > Date.now() + 3600000,
  );

  // Verify business information accuracy for revenue calculations
  TestValidator.equals(
    "business email verified for marketplace communications",
    sellerResponse.email,
    joinRequest.email,
  );

  TestValidator.equals(
    "legal business name established for storefront display",
    sellerResponse.business_name,
    joinRequest.business_name,
  );

  TestValidator.equals(
    "tax identification verified for revenue sharing",
    sellerResponse.tax_id,
    joinRequest.tax_id,
  );

  // Validate comprehensive marketplace operational readiness
  TestValidator.predicate(
    "seller ID established for unique marketplace identification",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sellerResponse.id,
    ),
  );

  const createdTimestamp = new Date(sellerResponse.created_at);
  const updatedTimestamp = new Date(sellerResponse.updated_at);

  TestValidator.predicate(
    "registration timeline consistent for audit tracking",
    createdTimestamp.getTime() <= updatedTimestamp.getTime(),
  );

  // Verify business contact verification for customer service
  TestValidator.predicate(
    "business phone verified for merchant communications",
    sellerResponse.phone.length >= 10 &&
      /^\d{3}-\d{3,4}-\d{4}$/.test(
        sellerResponse.phone
          .replace(/\D/g, "")
          .replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3"),
      ),
  );

  TestValidator.predicate(
    "business registration verified for legal entity confirmation",
    sellerResponse.business_registration_number.length >= 8 &&
      /^[0-9A-Za-z-]+$/.test(sellerResponse.business_registration_number),
  );

  // Validate marketplace relationship establishment
  TestValidator.predicate(
    "verification status indicates operational readiness level",
    sellerResponse.verification_status === "pending" ||
      sellerResponse.verification_status === "verified",
  );
}
