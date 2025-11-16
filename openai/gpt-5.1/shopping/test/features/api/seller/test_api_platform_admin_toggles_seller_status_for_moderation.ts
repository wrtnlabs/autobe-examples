import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform administrator can toggle a seller account status for
 * moderation.
 *
 * Business goal:
 *
 * - Ensure that an authenticated platform admin, operating under the admin
 *   namespace, can update a seller's lifecycle status (e.g., to a moderation
 *   state like "suspended") via the platformAdmin sellers.update endpoint,
 *   while not altering unrelated profile fields.
 *
 * High-level flow:
 *
 * 1. Join as a platform administrator via POST /auth/platformAdmin/join, which
 *    both creates the admin identity and establishes an authenticated admin
 *    session.
 * 2. Within this admin session, create a guest user via POST
 *    /shoppingMall/platformAdmin/guestUsers to validate that auxiliary
 *    admin-only operations succeed and share the same authorization context.
 * 3. Generate a target sellerId (UUID) that represents an existing seller record
 *    in the real system; in simulation mode this will simply drive the SDK call
 *    and typing.
 * 4. Call PUT /shoppingMall/platformAdmin/sellers/{sellerId} with an
 *    IShoppingMallSeller.IUpdate body that only changes "status" to a
 *    moderation state string such as "suspended", leaving other fields
 *    undefined so they are not overwritten.
 * 5. Assert that the response conforms to IShoppingMallSeller, and that the id in
 *    the response matches sellerId and the status field equals the requested
 *    new value.
 * 6. Optionally sanity-check lifecycle timestamps and soft-delete semantics
 *    without duplicating type validation that typia.assert already performs.
 */
export async function test_api_platform_admin_toggles_seller_status_for_moderation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a platform administrator via join API.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "203.0.113.10",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Using the same admin session, create a guest user in the platformAdmin namespace.
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: "Mozilla/5.0 (E2E Test Suite)",
  } satisfies IShoppingMallGuestUser.ICreate;

  const guest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guest);

  // Basic sanity assertion on guest identity: after typia.assert, we only
  // express a simple business-like check (non-empty id) without re-checking types.
  TestValidator.predicate(
    "guest user id should be non-empty",
    guest.id.length > 0,
  );

  // 3. Determine target sellerId to update.
  // In a full E2E environment this would be a real seller; here we use a random UUID
  // to exercise the SDK call and rely on simulation or seeded data.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare an update payload that only changes the lifecycle status.
  const newStatus = "suspended";
  const updateBody = {
    status: newStatus,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.platformAdmin.sellers.update(connection, {
      sellerId,
      body: updateBody,
    });
  typia.assert(updatedSeller);

  // 5. Assert that the seller id and status match expectations.
  TestValidator.equals(
    "updated seller.id should match path sellerId",
    updatedSeller.id,
    sellerId,
  );

  TestValidator.equals(
    "updated seller.status should equal requested moderation status",
    updatedSeller.status,
    newStatus,
  );

  // 6. Sanity-check lifecycle timestamps and soft-delete semantics without
  // duplicating type validations already enforced by typia.assert.
  TestValidator.predicate(
    "seller.created_at should be non-empty",
    updatedSeller.created_at.length > 0,
  );

  TestValidator.predicate(
    "seller.updated_at should be non-empty",
    updatedSeller.updated_at.length > 0,
  );

  TestValidator.predicate(
    "seller.deleted_at should be null or undefined for a suspended (non-terminal) state",
    updatedSeller.deleted_at === null || updatedSeller.deleted_at === undefined,
  );
}
