import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify platform admin gets an error when requesting a non-existent guest
 * user.
 *
 * Business context: Platform admins can inspect persisted guest user identities
 * stored in `shopping_mall_guestuser` via the detail endpoint GET
 * /shoppingMall/platformAdmin/guestUsers/{guestUserId}. When an admin queries a
 * guestUserId that does not exist, the backend should not leak internal errors
 * but instead expose a clean "not found" style behavior (represented to the SDK
 * consumer as an error).
 *
 * This test ensures two things:
 *
 * 1. A valid admin session can successfully read an existing guest user.
 * 2. Using the same admin session, requesting a random, non-existent guestUserId
 *    causes the SDK call to fail (e.g., Not Found) rather than succeeding with
 *    bogus data.
 *
 * Steps:
 *
 * 1. Join as a platform admin to obtain an authenticated connection.
 * 2. Create a real guest user record to ensure the guest table and endpoint are
 *    operational.
 * 3. Fetch that created guest user by id and validate the response shape.
 * 4. Generate a random UUID that is distinct from the existing guest user id.
 * 5. Call the GET detail endpoint with the random UUID and assert that an error is
 *    thrown via TestValidator.error.
 */
export async function test_api_platform_admin_guest_user_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth bootstrap)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a real guest user to ensure table/endpoint operational
  const createGuestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: `Mozilla/5.0 (${RandomGenerator.alphaNumeric(6)})`,
  } satisfies IShoppingMallGuestUser.ICreate;

  const createdGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: createGuestBody },
    );
  typia.assert(createdGuest);

  // 3. Happy-path: fetch the created guest user and validate
  const fetchedExisting: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.at(connection, {
      guestUserId: createdGuest.id,
    });
  typia.assert(fetchedExisting);

  TestValidator.equals(
    "fetched existing guest user should match created id",
    fetchedExisting.id,
    createdGuest.id,
  );

  // 4. Generate a random UUID not equal to existing id
  let unknownGuestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownGuestUserId === createdGuest.id) {
    // Very unlikely, but regenerate once defensively
    unknownGuestUserId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Negative case: accessing non-existent guest user id should fail
  await TestValidator.error(
    "platform admin detail lookup should error for unknown guest user id",
    async () => {
      await api.functional.shoppingMall.platformAdmin.guestUsers.at(
        connection,
        {
          guestUserId: unknownGuestUserId,
        },
      );
    },
  );
}
