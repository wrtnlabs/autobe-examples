import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test self-service seller profile update and business rule enforcement.
 *
 * This scenario:
 *
 * 1. Registers a new seller account (auth.seller.join) and retrieves the current
 *    profile
 * 2. Updates allowed fields (display_name, contact_phone) and verifies result
 * 3. Confirms that status is also updatable by business logic
 * 4. Verifies audit field (updated_at) is changed
 *
 * Steps:
 *
 * - Register new seller account.
 * - Update display_name and contact_phone with new valid values.
 * - Verify the changes are reflected in seller profile.
 * - Update status field to a valid business value and check it is allowed.
 * - Check that updated_at timestamp changes after updates.
 */
export async function test_api_seller_profile_update_self_service(
  connection: api.IConnection,
) {
  // 1. Register new seller account
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerAuth: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuth);

  // Keep base seller info for later checks
  const sellerId = sellerAuth.id;
  const origUpdatedAt = sellerAuth.updated_at;

  // 2. Update allowed fields: display_name, contact_phone
  const updateBodyAllowed = {
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
  } satisfies IShoppingSeller.IUpdate;
  const updatedSeller: IShoppingSeller =
    await api.functional.shopping.seller.sellers.update(connection, {
      sellerId,
      body: updateBodyAllowed,
    });
  typia.assert(updatedSeller);
  TestValidator.equals(
    "display_name updated",
    updatedSeller.display_name,
    updateBodyAllowed.display_name,
  );
  TestValidator.equals(
    "contact_phone updated",
    updatedSeller.contact_phone,
    updateBodyAllowed.contact_phone,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedSeller.updated_at,
    origUpdatedAt,
  );

  // 3. Update status field to 'active' (should be business-logic allowed)
  const updateStatusBody = {
    status: "active",
  } satisfies IShoppingSeller.IUpdate;
  const statusUpdatedSeller: IShoppingSeller =
    await api.functional.shopping.seller.sellers.update(connection, {
      sellerId,
      body: updateStatusBody,
    });
  typia.assert(statusUpdatedSeller);
  TestValidator.equals(
    "status field updated",
    statusUpdatedSeller.status,
    "active",
  );
}
