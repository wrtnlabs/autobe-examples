import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate admin-driven update of seller profile fields.
 *
 * 1. Register a new admin to obtain an admin-privileged connection
 * 2. Register a new seller via onboarding endpoint
 * 3. As admin, update the seller's profile: change display_name, contact_phone and
 *    status (allowed fields), ensuring immutable fields (id, email, created_at)
 *    are NOT changed
 * 4. Validate updated properties are changed, unchanged properties remain as
 *    before, and updated_at changes
 */
export async function test_api_seller_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super", // Minimal privilege role required for this test
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerAuth: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);
  // Prepare initial seller snapshot for field freeze check
  const originalProfile = {
    id: sellerAuth.id,
    email: sellerAuth.email,
    display_name: sellerAuth.display_name,
    contact_phone: sellerAuth.contact_phone,
    status: sellerAuth.status,
    created_at: sellerAuth.created_at,
    updated_at: sellerAuth.updated_at,
  } satisfies IShoppingSeller;

  // 3. As admin, update seller's profile (allowed fields only)
  const updatedName = RandomGenerator.name();
  const updatedPhone = RandomGenerator.mobile();
  const updatedStatus = RandomGenerator.pick([
    "active",
    "suspended",
    "rejected",
  ] as const);
  const updateBody = {
    display_name: updatedName,
    contact_phone: updatedPhone,
    status: updatedStatus,
  } satisfies IShoppingSeller.IUpdate;
  const updated = await api.functional.shopping.admin.sellers.update(
    connection,
    {
      sellerId: sellerAuth.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 4. Validate field update results
  TestValidator.equals(
    "sellerId remains unchanged",
    updated.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "email remains unchanged",
    updated.email,
    originalProfile.email,
  );
  TestValidator.equals(
    "display_name is updated",
    updated.display_name,
    updatedName,
  );
  TestValidator.equals(
    "contact_phone is updated",
    updated.contact_phone,
    updatedPhone,
  );
  TestValidator.equals("status is updated", updated.status, updatedStatus);
  TestValidator.notEquals(
    "updated_at changes",
    updated.updated_at,
    originalProfile.updated_at,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updated.created_at,
    originalProfile.created_at,
  );
}
