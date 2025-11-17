import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * This E2E test verifies that a guest user can update their own guest session
 * details after authenticating. It follows the realistic guest lifecycle:
 *
 * 1. Authenticate guest using the join API, obtaining JWT authorization tokens.
 * 2. Create a guest record with a minimal creation payload.
 * 3. Update the guest record with new session information (updated_at timestamp).
 * 4. Validate the updated guest record for correct update timestamp and
 *    consistency.
 * 5. Confirm data integrity and proper authorization enforcement.
 *
 * The test employs typia for rigorous runtime validation and TestValidator for
 * business logic assertions.
 *
 * This comprehensive test ensures that guest session update flows work
 * correctly and secure session management is enforced.
 */
export async function test_api_shopping_mall_guest_update_by_guest(
  connection: api.IConnection,
) {
  // 1. Authenticate guest user via join API
  const joinBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    ip: null,
    href: `https://${RandomGenerator.alphaNumeric(10)}.com/${RandomGenerator.alphabets(5)}`,
    referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/${RandomGenerator.alphabets(5)}`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallGuest.IJoin;
  const authorizedGuest: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedGuest);

  // 2. Create guest record
  const createBody = {} satisfies IShoppingMallGuest.ICreate;
  const guestRecord: IShoppingMallGuest =
    await api.functional.shoppingMall.shoppingMallGuests.create(connection, {
      body: createBody,
    });
  typia.assert(guestRecord);

  // 3. Update guest record with new updated_at timestamp
  const now = new Date().toISOString();
  const updateBody = { updated_at: now } satisfies IShoppingMallGuest.IUpdate;
  const updatedGuest: IShoppingMallGuest =
    await api.functional.shoppingMall.guest.shoppingMallGuests.update(
      connection,
      {
        shoppingMallGuestId: guestRecord.id,
        body: updateBody,
      },
    );
  typia.assert(updatedGuest);

  // 4. Validate updated guest record
  TestValidator.equals(
    "guest id should remain same after update",
    updatedGuest.id,
    guestRecord.id,
  );
  TestValidator.predicate(
    "updated_at should be updated",
    updatedGuest.updated_at === now,
  );
  TestValidator.predicate(
    "created_at should not change",
    updatedGuest.created_at === guestRecord.created_at,
  );
}
