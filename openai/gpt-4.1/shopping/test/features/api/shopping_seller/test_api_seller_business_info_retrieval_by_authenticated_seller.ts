import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerBusinessInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerBusinessInfo";

/**
 * Test that an authenticated seller can successfully retrieve their own
 * business registration and compliance information.
 *
 * 1. Register as a new seller (POST /auth/seller/join) with unique email,
 *    password, display name, and contact phone.
 * 2. Obtain seller ID and token from the registration response.
 * 3. Retrieve business info (GET /shopping/seller/sellers/{sellerId}/businessInfo)
 *    using the sellerId and authenticated connection.
 * 4. Validate that the businessInfo record matches the registered seller ID, has
 *    all required fields (legal_entity_name, registration_number, etc.), and
 *    fields are of the correct type.
 * 5. Ensure all UUID and date-time fields conform to proper formats.
 * 6. Confirm immutable fields and reference IDs are properly set for the seller
 *    account.
 */
export async function test_api_seller_business_info_retrieval_by_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Register as a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(15),
        display_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Retrieve business info for the new seller using authenticated token and the seller's ID
  const businessInfo: IShoppingSellerBusinessInfo =
    await api.functional.shopping.seller.sellers.businessInfo.at(connection, {
      sellerId: seller.id,
    });
  typia.assert(businessInfo);

  // 3. Validate business info fields
  TestValidator.equals(
    "sellerId should match shopping_seller_id",
    businessInfo.shopping_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "businessInfo.id should be UUID",
    typeof businessInfo.id === "string" &&
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/.test(
        businessInfo.id,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/.test(
      businessInfo.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/.test(
      businessInfo.updated_at,
    ),
  );

  // Validate crucial fields are present (non-empty string for required KYC fields)
  TestValidator.predicate(
    "legal_entity_name present",
    typeof businessInfo.legal_entity_name === "string" &&
      businessInfo.legal_entity_name.length > 0,
  );
  TestValidator.predicate(
    "registration_number present",
    typeof businessInfo.registration_number === "string" &&
      businessInfo.registration_number.length > 0,
  );
  TestValidator.predicate(
    "representative_name present",
    typeof businessInfo.representative_name === "string" &&
      businessInfo.representative_name.length > 0,
  );
  TestValidator.predicate(
    "support_contact present",
    typeof businessInfo.support_contact === "string" &&
      businessInfo.support_contact.length > 0,
  );
  TestValidator.predicate(
    "bank_account_number present",
    typeof businessInfo.bank_account_number === "string" &&
      businessInfo.bank_account_number.length > 0,
  );
}
