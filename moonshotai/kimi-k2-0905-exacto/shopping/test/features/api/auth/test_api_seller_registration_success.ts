import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful seller registration with comprehensive business verification.
 *
 * Validates complete merchant onboarding workflow with authentic business data:
 *
 * 1. Generate realistic business profile with government-issued identifiers
 * 2. Submit complete registration including tax compliance information
 * 3. Verify successful account creation with complete business details
 * 4. Validate authentication credentials and token issuance
 * 5. Confirm business verification status and marketplace permissions
 * 6. Test compliance with business entity classification requirements
 *
 * This comprehensive test ensures proper seller onboarding, business identity
 * verification, and marketplace access provisioning for merchant operations.
 */
export async function test_api_seller_registration_success(
  connection: api.IConnection,
) {
  // Generate realistic business registration data with proper formats
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name() + " Corporation",
    business_registration_number: RandomGenerator.alphaNumeric(12),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "Corporation",
      "LLC",
      "Partnership",
      "Sole Proprietorship",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  // Complete seller registration process
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });
  typia.assert(seller);

  // Validate business profile completeness
  TestValidator.equals(
    "business name registration",
    seller.business_name,
    registrationData.business_name,
  );
  TestValidator.equals(
    "business email verification",
    seller.email,
    registrationData.email,
  );
  TestValidator.equals(
    "business registration number validation",
    seller.business_registration_number,
    registrationData.business_registration_number,
  );
  TestValidator.equals(
    "tax identification verification",
    seller.tax_id,
    registrationData.tax_id,
  );
  TestValidator.equals(
    "business contact phone validation",
    seller.phone,
    registrationData.phone,
  );
  TestValidator.equals(
    "business entity classification",
    seller.business_type,
    registrationData.business_type,
  );

  // Validate authentication and marketplace access
  TestValidator.predicate(
    "seller ID format validation",
    typia.is<string & tags.Format<"uuid">>(seller.id),
  );
  TestValidator.predicate(
    "business verification status assignment",
    seller.verification_status === "pending" ||
      seller.verification_status === "verified" ||
      seller.verification_status === "suspended" ||
      seller.verification_status === "rejected",
  );
  TestValidator.predicate(
    "marketplace commission rate application",
    seller.commission_rate > 0 && seller.commission_rate < 1,
  );
  TestValidator.predicate(
    "initial verification status assignment",
    seller.is_verified === false,
  );
  TestValidator.predicate(
    "account creation timestamp",
    seller.created_at !== undefined && seller.created_at.length > 0,
  );
  TestValidator.predicate(
    "account modification timestamp",
    seller.updated_at !== undefined && seller.updated_at.length > 0,
  );

  // Validate JWT authentication token
  TestValidator.predicate(
    "access token generation",
    seller.token.access !== undefined && seller.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh token provision",
    seller.token.refresh !== undefined && seller.token.refresh.length > 10,
  );
  TestValidator.predicate(
    "token expiration timestamp",
    seller.token.expired_at !== undefined && seller.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable until timestamp",
    seller.token.refreshable_until !== undefined &&
      seller.token.refreshable_until.length > 0,
  );

  // Validate ISO 8601 date-time format compliance
  TestValidator.predicate(
    "created_at ISO date compliance",
    typia.is<string & tags.Format<"date-time">>(seller.created_at),
  );
  TestValidator.predicate(
    "updated_at ISO date compliance",
    typia.is<string & tags.Format<"date-time">>(seller.updated_at),
  );
  TestValidator.predicate(
    "token expiration ISO date compliance",
    typia.is<string & tags.Format<"date-time">>(seller.token.expired_at),
  );
  TestValidator.predicate(
    "token refreshable_until ISO date compliance",
    typia.is<string & tags.Format<"date-time">>(seller.token.refreshable_until),
  );

  // Validate business entity classification compliance
  TestValidator.predicate(
    "valid business entity type",
    ["Corporation", "LLC", "Partnership", "Sole Proprietorship"].includes(
      seller.business_type,
    ),
  );
}
