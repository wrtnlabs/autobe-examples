import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test seller retrieval with pending approval status verification.
 *
 * Validates the GET /ecommercePlatform/sellers/{sellerId} endpoint behavior when retrieving a seller account that has a 'pending' approval status. Ensures the response correctly reflects the pending state with rejection_reason as null, since rejection reasons are only populated when approval_status is 'rejected'. Confirms that all non-sensitive account fields are returned correctly for administrative review purposes.
 *
 * This test validates that the seller endpoint correctly handles the pending status and returns all non-sensitive account fields as specified.
 *
 * 1. Generate a random seller UUID for retrieval.
 * 2. Retrieve the seller account using the API with the generated UUID.
 * 3. Validate the response structure using typia.assert.
 * 4. Verify that approval_status is 'pending'.
 * 5. Verify that rejection_reason is null since pending status should not have rejection reasons.
 * 6. Validate all other non-sensitive seller fields are correctly returned.
 */
export async function test_api_seller_retrieval_pending_approval(
  connection: api.IConnection,
) {
  // 1. Generate a random seller UUID
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve the seller account using the API
  const seller = await api.functional.ecommercePlatform.sellers.at(connection, {
    sellerId,
  });
  typia.assert(seller);
  // 3. Verify approval_status is 'pending'
  TestValidator.equals(
    "approval_status is pending",
    seller.approval_status,
    "pending",
  );
  // 4. Verify rejection_reason is null since status is pending
  TestValidator.equals(
    "rejection_reason is null",
    seller.rejection_reason,
    null,
  );
  // 5. Verify essential fields exist and are valid
  TestValidator.predicate(
    "seller has valid email",
    /^[^@]+@[^@]+\.[^@]+$/.test(seller.email),
  );
  // Note: is_banned is a boolean, but we don't test its specific value for pending status
  // as it depends on business logic which could vary
  // 6. Verify timestamps are present
  TestValidator.predicate(
    "seller has created_at timestamp",
    seller.created_at.length > 0,
  );
  TestValidator.predicate(
    "seller has updated_at timestamp",
    seller.updated_at.length > 0,
  );
  // Note: deleted_at is nullable/undefined as the account is not soft-deleted
  // 7. Verify soft-delete state for active account
  TestValidator.predicate(
    "deleted_at is null or undefined for active account",
    seller.deleted_at === null || seller.deleted_at === undefined,
  );
  // 8. Verify profile fields (can be null if seller hasn't created a profile)
  // For pending sellers, profile info may be null since they haven't completed setup
  TestValidator.predicate(
    "shop_name is present or null",
    seller.shop_name === null || seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "shop_description is present or null",
    seller.shop_description === null || seller.shop_description.length > 0,
  );
  TestValidator.predicate(
    "logo_image_uri is present or null",
    seller.logo_image_uri === null || seller.logo_image_uri.length > 0,
  );
  // 9. Verify profile timestamps (can be null if no profile exists)
  TestValidator.predicate(
    "profile_created_at is valid or null",
    seller.profile_created_at === null || seller.profile_created_at.length > 0,
  );
  TestValidator.predicate(
    "profile_updated_at is valid or null",
    seller.profile_updated_at === null || seller.profile_updated_at.length > 0,
  );
  TestValidator.predicate(
    "profile_deleted_at is valid, null, or undefined",
    seller.profile_deleted_at === null ||
      seller.profile_deleted_at === undefined ||
      seller.profile_deleted_at.length > 0,
  );
}
