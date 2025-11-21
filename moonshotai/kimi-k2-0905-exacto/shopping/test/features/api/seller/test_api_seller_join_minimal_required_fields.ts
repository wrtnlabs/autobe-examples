import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration with only mandatory fields to validate system
 * flexibility and essential data capture. Ensures that sellers can create
 * accounts with minimal required information while maintaining essential
 * business verification and contact details for marketplace operations and
 * customer communication capabilities.
 *
 * This test validates:
 *
 * 1. Seller registration with all mandatory fields
 * 2. Business registration number format validation
 * 3. Business type classification accuracy
 * 4. Authentication token generation for immediate access
 * 5. Account verification status initialization
 */
export async function test_api_seller_join_minimal_required_fields(
  connection: api.IConnection,
) {
  // Generate all mandatory field data
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(RandomGenerator.pick([2, 3, 4])),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "corporation",
      "llc",
      "partnership",
      "sole_proprietorship",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  // Perform seller registration
  const seller = await api.functional.auth.seller.join(connection, {
    body: requestBody,
  });

  // Validate response structure
  typia.assert(seller);

  // Verify all mandatory fields are preserved
  TestValidator.equals("email matches", seller.email, requestBody.email);
  TestValidator.equals(
    "business name matches",
    seller.business_name,
    requestBody.business_name,
  );
  TestValidator.equals(
    "business registration number matches",
    seller.business_registration_number,
    requestBody.business_registration_number,
  );
  TestValidator.equals("tax ID matches", seller.tax_id, requestBody.tax_id);
  TestValidator.equals("phone matches", seller.phone, requestBody.phone);
  TestValidator.equals(
    "business type matches",
    seller.business_type,
    requestBody.business_type,
  );

  // Validate generated response fields
  TestValidator.predicate("has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(seller.id),
  );
  TestValidator.predicate(
    "verification status is valid",
    () => typeof seller.verification_status === "string",
  );
  TestValidator.predicate(
    "commission rate is valid number",
    () =>
      typeof seller.commission_rate === "number" && seller.commission_rate >= 0,
  );
  TestValidator.predicate(
    "is_verified is boolean",
    () => typeof seller.is_verified === "boolean",
  );

  // Verify timestamps are properly generated
  TestValidator.predicate("created_at is valid datetime", () =>
    typia.is<string & tags.Format<"date-time">>(seller.created_at),
  );
  TestValidator.predicate("updated_at is valid datetime", () =>
    typia.is<string & tags.Format<"date-time">>(seller.updated_at),
  );

  // Validate authentication token
  typia.assert(seller.token);
  TestValidator.predicate(
    "access token is string",
    () =>
      typeof seller.token.access === "string" && seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is string",
    () =>
      typeof seller.token.refresh === "string" &&
      seller.token.refresh.length > 0,
  );
  TestValidator.predicate("expiration dates are valid", () => {
    const now = new Date().toISOString();
    return (
      seller.token.expired_at > now && seller.token.refreshable_until > now
    );
  });
}
