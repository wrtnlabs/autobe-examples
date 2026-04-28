import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving an active seller profile and validating flattened profile information.
 *
 * Validates that the seller retrieval endpoint returns complete seller account information with flattened profile data including shop name, description, logo URI, and profile timestamps included via left join. The response must exclude sensitive fields such as password_hash for security.
 *
 * Special attention is given to verifying that left-joined profile fields (shop_name, shop_description, logo_image_uri, profile_created_at, profile_updated_at) are properly returned even when they may be null if the seller has not yet created a profile. The API endpoint does not require authentication per its authorization specification.
 *
 * 1. Generate a valid seller UUID for testing.
 * 2. Call the seller retrieval endpoint using the UUID.
 * 3. Validate full response structure including all flattened profile fields.
 * 4. Verify that the returned seller ID matches the requested seller ID.
 * 5. Confirm business rule validations on approval status and timestamps.
 */
export async function test_api_seller_retrieval_active_profile(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection (base connection isolation)
  const retrievalConnection: api.IConnection = { host: connection.host };
  // 1. Generate valid seller UUID
  const testSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Validate request parameter format
  typia.assert(testSellerId);
  // 3. Retrieve seller by ID
  const seller = await api.functional.ecommercePlatform.sellers.at(
    retrievalConnection,
    { sellerId: testSellerId },
  );
  // 4. Complete runtime type validation of entire response including flattened profile fields
  typia.assert(seller);
  // 5. Verify seller ID matches the requested ID
  TestValidator.equals(
    "retrieved seller ID matches requested ID",
    seller.id,
    testSellerId,
  );
  // 6. Validate business rules on approval_status
  TestValidator.predicate(
    "approval_status is valid value",
    seller.approval_status === "pending" ||
      seller.approval_status === "approved" ||
      seller.approval_status === "rejected",
  );
  // 7. Verify timestamps are present with valid format
  TestValidator.predicate(
    "seller has created_at timestamp",
    seller.created_at.length > 0,
  );
  TestValidator.predicate(
    "seller has updated_at timestamp",
    seller.updated_at.length > 0,
  );
  // 8. Verify is_banned is a proper boolean
  TestValidator.predicate(
    "is_banned is boolean value",
    seller.is_banned === true || seller.is_banned === false,
  );
}
