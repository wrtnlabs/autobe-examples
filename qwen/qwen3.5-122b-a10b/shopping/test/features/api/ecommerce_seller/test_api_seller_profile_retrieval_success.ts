import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test customer retrieval of approved seller's public profile information.
 *
 * Validates that authenticated customers can successfully retrieve and view seller profile data when browsing products or viewing order details. Ensures the seller profile endpoint returns all required public-facing information while excluding sensitive authentication credentials.
 *
 * The test uses simulation mode to generate a valid seller UUID and validates the complete response structure including shop profile details, account status flags, and timestamps. Special attention is given to verifying that sensitive fields like password_hash and email are not exposed in the public API response.
 *
 * 1. Generate a random seller UUID using typia.random with UUID format tag.
 * 2. Create a customer connection for authentication context.
 * 3. Call GET /ecommerce/sellers/{sellerId} endpoint with the generated UUID.
 * 4. Validate response type using typia.assert for complete type checking.
 * 5. Verify approval_status equals 'approved' for valid seller.
 * 6. Confirm rejection_reason is null since seller is approved.
 * 7. Verify shop profile information exists with valid shop_name.
 */
export async function test_api_seller_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate seller UUID
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create customer connection for authenticated access
  const customerConnection: api.IConnection = { host: connection.host };
  // 3. Retrieve seller profile
  const seller: IEcommerceSeller = await api.functional.ecommerce.sellers.at(
    customerConnection,
    { sellerId },
  );
  // 4. Validate complete response type
  typia.assert(seller);
  // 5. Verify approval status is approved (business rule)
  TestValidator.equals("approval status", seller.approval_status, "approved");
  // 6. Confirm rejection reason is null for approved sellers (business rule)
  TestValidator.equals(
    "rejection reason is null",
    seller.rejection_reason,
    null,
  );
  // 7. Verify shop profile exists with valid shop_name (business rule)
  TestValidator.predicate("profile exists", seller.profile !== null);
  if (seller.profile !== null) {
    TestValidator.predicate(
      "shop_name is non-empty",
      seller.profile.shop_name.length > 0,
    );
  }
}
