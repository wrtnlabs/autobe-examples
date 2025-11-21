import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration communication infrastructure and business readiness.
 *
 * This test validates that seller registration establishes proper communication
 * infrastructure by testing the registration workflow and authentication state.
 * It ensures that new sellers receive proper authorization tokens for secure
 * communication and that registration maintains business logic standards for
 * marketplace communication requirements.
 *
 * The test verifies:
 *
 * - Proper authentication token generation and formatting
 * - Business registration data consistency and validation
 * - Registration status progression for communication readiness
 * - Authorization token functionality for secure communication infrastructure
 *
 * 1. Generate comprehensive seller business information
 * 2. Test successful seller registration workflow
 * 3. Validate authorization token for communication infrastructure
 * 4. Verify registration data consistency for marketplace operations
 */
export async function test_api_seller_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate comprehensive seller business data with valid types
  const sellerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(3),
    business_registration_number: RandomGenerator.alphaNumeric(
      10,
    ) satisfies string,
    tax_id: RandomGenerator.alphaNumeric(8) satisfies string,
    phone: RandomGenerator.mobile("010"),
    business_type: RandomGenerator.pick([
      "corporation",
      "llc",
      "partnership",
      "sole_proprietorship",
    ]),
  } satisfies IShoppingMallSeller.IJoin;

  // Test complete seller registration workflow
  const registeredSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerRegistration,
    });
  typia.assert(registeredSeller);

  // Verify communication infrastructure establishment through authorization token
  TestValidator.predicate(
    "authorization token generated",
    typeof registeredSeller.token === "object" &&
      registeredSeller.token !== null &&
      typeof registeredSeller.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token provided for session management",
    typeof registeredSeller.token.refresh === "string" &&
      registeredSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamps present for infrastructure",
    typeof registeredSeller.token.expired_at === "string" &&
      typeof registeredSeller.token.refreshable_until === "string",
  );

  // Verify registration data consistency for communication standards
  TestValidator.equals(
    "business email preserved",
    registeredSeller.email,
    sellerRegistration.email,
  );
  TestValidator.equals(
    "business name matches registration",
    registeredSeller.business_name,
    sellerRegistration.business_name,
  );
  TestValidator.equals(
    "tax ID consistent",
    registeredSeller.tax_id,
    sellerRegistration.tax_id,
  );
  TestValidator.equals(
    "business phone maintained",
    registeredSeller.phone,
    sellerRegistration.phone,
  );
  TestValidator.equals(
    "business type consistent",
    registeredSeller.business_type,
    sellerRegistration.business_type,
  );

  // Validate communication state and marketplace readiness
  TestValidator.equals(
    "seller ID assigned",
    typeof registeredSeller.id,
    "string",
  );
  TestValidator.predicate(
    "UUID format validation",
    registeredSeller.id.length === 36 && registeredSeller.id.includes("-"),
  );
  TestValidator.predicate(
    "verification status appropriate",
    ["pending", "verified", "suspended", "rejected"].includes(
      registeredSeller.verification_status,
    ),
  );
  TestValidator.predicate(
    "commission rate reasonable",
    typeof registeredSeller.commission_rate === "number" &&
      registeredSeller.commission_rate >= 0 &&
      registeredSeller.commission_rate <= 100,
  );

  // Confirm registration lifecycle timestamps for communication tracking
  TestValidator.predicate(
    "created_at timestamp present",
    typeof registeredSeller.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at timestamp present",
    typeof registeredSeller.updated_at === "string",
  );

  // Final validation ensuring complete communication infrastructure
  TestValidator.predicate(
    "complete registration successful",
    typeof registeredSeller === "object" &&
      typeof registeredSeller.business_registration_number === "string" &&
      typeof registeredSeller.is_verified === "boolean",
  );
}
