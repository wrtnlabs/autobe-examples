import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test data integrity of seller profile information by verifying that all
 * required seller fields are properly populated when retrieved. This scenario
 * validates complete seller profile data including business name, registration
 * number, tax ID, phone number, verification status, commission rates, and
 * timestamps. Tests that no required fields are missing or null in the
 * response, ensuring consistent data quality across the seller directory.
 */
export async function test_api_seller_profile_data_integrity(
  connection: api.IConnection,
) {
  // Generate random seller ID for testing
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve seller profile data
  const seller = await api.functional.shoppingMall.sellers.at(connection, {
    sellerId: sellerId,
  });

  // Validate response type structure
  typia.assert(seller);

  // Test 1: Validate all required fields are present and not null/undefined
  TestValidator.predicate(
    "seller ID exists",
    seller.id !== null && seller.id !== undefined,
  );
  TestValidator.predicate(
    "business email exists",
    seller.email !== null && seller.email !== undefined,
  );
  TestValidator.predicate(
    "business name exists",
    seller.business_name !== null && seller.business_name !== undefined,
  );
  TestValidator.predicate(
    "business registration number exists",
    seller.business_registration_number !== null &&
      seller.business_registration_number !== undefined,
  );
  TestValidator.predicate(
    "tax ID exists",
    seller.tax_id !== null && seller.tax_id !== undefined,
  );
  TestValidator.predicate(
    "phone number exists",
    seller.phone !== null && seller.phone !== undefined,
  );
  TestValidator.predicate(
    "business type exists",
    seller.business_type !== null && seller.business_type !== undefined,
  );
  TestValidator.predicate(
    "verification status exists",
    seller.verification_status !== null &&
      seller.verification_status !== undefined,
  );
  TestValidator.predicate(
    "commission rate exists",
    seller.commission_rate !== null && seller.commission_rate !== undefined,
  );
  TestValidator.predicate(
    "verification flag exists",
    seller.is_verified !== null && seller.is_verified !== undefined,
  );
  TestValidator.predicate(
    "created timestamp exists",
    seller.created_at !== null && seller.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    seller.updated_at !== null && seller.updated_at !== undefined,
  );

  // Test 2: Validate field formats
  TestValidator.predicate("email format valid", seller.email.includes("@"));
  TestValidator.predicate("UUID format valid", seller.id.length === 36);
  TestValidator.predicate(
    "commission rate is number",
    typeof seller.commission_rate === "number",
  );
  TestValidator.predicate(
    "is_verified is boolean",
    typeof seller.is_verified === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid date format",
    seller.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is valid date format",
    seller.updated_at.includes("T"),
  );

  // Test 3: Validate business logic constraints
  TestValidator.predicate(
    "commission rate is non-negative",
    seller.commission_rate >= 0,
  );
  TestValidator.predicate(
    "commission rate is reasonable",
    seller.commission_rate <= 100,
  );
  TestValidator.predicate(
    "business name is not empty",
    seller.business_name.trim().length > 0,
  );
  TestValidator.predicate("email is not empty", seller.email.trim().length > 0);
  TestValidator.predicate("phone is not empty", seller.phone.trim().length > 0);
  TestValidator.predicate(
    "business registration number is not empty",
    seller.business_registration_number.trim().length > 0,
  );
  TestValidator.predicate(
    "tax ID is not empty",
    seller.tax_id.trim().length > 0,
  );
  TestValidator.predicate(
    "business type is not empty",
    seller.business_type.trim().length > 0,
  );
  TestValidator.predicate(
    "verification status is not empty",
    seller.verification_status.trim().length > 0,
  );

  // Test 4: Validate multiple sellers for consistency
  const sellerIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const testSellerId of sellerIds) {
    const testSeller = await api.functional.shoppingMall.sellers.at(
      connection,
      {
        sellerId: testSellerId,
      },
    );

    // Validate each seller has consistent data structure
    typia.assert(testSeller);

    // Verify all required fields exist for each seller
    TestValidator.predicate(
      "seller ID consistency",
      testSeller.id !== null && testSeller.id !== undefined,
    );
    TestValidator.predicate(
      "business email consistency",
      testSeller.email !== null && testSeller.email !== undefined,
    );
    TestValidator.predicate(
      "business name consistency",
      testSeller.business_name !== null &&
        testSeller.business_name !== undefined,
    );
    TestValidator.predicate(
      "commission rate consistency",
      testSeller.commission_rate !== null &&
        testSeller.commission_rate !== undefined,
    );
    TestValidator.predicate(
      "verification status consistency",
      testSeller.verification_status !== null &&
        testSeller.verification_status !== undefined,
    );
  }

  // Test 5: Validate specific verification status values are valid
  const validStatuses = [
    "pending",
    "verified",
    "suspended",
    "rejected",
  ] as const;
  const status = seller.verification_status as unknown as string;
  TestValidator.predicate(
    "verification status is valid",
    validStatuses.includes(status as any),
  );

  // Test 6: Validate commission rate precision and reasonableness
  TestValidator.predicate(
    "commission rate is reasonable",
    seller.commission_rate >= 0 && seller.commission_rate <= 100,
  );
  TestValidator.predicate(
    "commission rate has reasonable decimal places",
    Math.round(seller.commission_rate * 100) / 100 === seller.commission_rate,
  );
}
