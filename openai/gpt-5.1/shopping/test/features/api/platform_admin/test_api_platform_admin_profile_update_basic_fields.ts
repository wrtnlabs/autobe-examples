import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin profile basic field update and persistence.
 *
 * Business goal
 *
 * - Ensure an authenticated platform admin can update mutable profile fields
 *   (email and displayName) on their own admin record using the
 *   platformAdmins.update endpoint.
 * - Verify that the update response reflects the new values while preserving
 *   immutable fields such as id and createdAt.
 * - Confirm that subsequent reads via platformAdmins.at return the updated
 *   values, proving that changes are persisted in the underlying Prisma model.
 *
 * Workflow
 *
 * 1. Join a new platform admin via POST /auth/platformAdmin/join to obtain an
 *    authorized admin session and identity
 *    (IShoppingMallPlatformAdmin.IAuthorized).
 * 2. Create a guest user via POST /shoppingMall/platformAdmin/guestUsers to
 *    satisfy the prerequisite that some guest identity exists.
 * 3. Prepare an IShoppingMallPlatformAdmin.IUpdate payload updating only `email`
 *    and `displayName` to new values.
 * 4. Call PUT /shoppingMall/platformAdmin/platformAdmins/{platformAdminId} with
 *    the created admin id and the update payload.
 * 5. Assert that the update response has:
 *
 *    - Unchanged id and createdAt.
 *    - Email and displayName equal to the new values.
 *    - UpdatedAt that is greater than or equal to the original updatedAt.
 * 6. Call GET /shoppingMall/platformAdmin/platformAdmins/{platformAdminId} and
 *    assert that the returned admin mirrors the updated values, proving
 *    persistence.
 */
export async function test_api_platform_admin_profile_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const originalAdminId = authorized.id;
  const originalEmail = authorized.email;
  const originalDisplayName = authorized.displayName;
  const originalCreatedAt = authorized.createdAt;
  const originalUpdatedAt = authorized.updatedAt;

  // 2. Create a guest user as a dependency requirement.
  const guestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestBody,
      },
    );
  typia.assert(guest);

  // 3. Prepare update payload for basic profile fields.
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const newDisplayName: string = RandomGenerator.name();

  const updateBody = {
    email: newEmail,
    displayName: newDisplayName,
  } satisfies IShoppingMallPlatformAdmin.IUpdate;

  // 4. Call update endpoint for the created platform admin.
  const updated: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.update(
      connection,
      {
        platformAdminId: originalAdminId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate update response fields.
  TestValidator.equals(
    "platform admin id should remain unchanged after update",
    updated.id,
    originalAdminId,
  );

  TestValidator.equals(
    "platform admin createdAt should remain unchanged after update",
    updated.createdAt,
    originalCreatedAt,
  );

  TestValidator.equals(
    "platform admin email should be updated to new value",
    updated.email,
    newEmail,
  );

  TestValidator.notEquals(
    "platform admin email should differ from original email",
    updated.email,
    originalEmail,
  );

  TestValidator.equals(
    "platform admin displayName should be updated to new value",
    updated.displayName,
    newDisplayName,
  );

  await TestValidator.predicate(
    "updatedAt should not go backwards",
    async () => {
      const originalTime = new Date(originalUpdatedAt).getTime();
      const updatedTime = new Date(updated.updatedAt).getTime();
      return updatedTime >= originalTime;
    },
  );

  // 6. Re-read the admin via detail endpoint to ensure persistence.
  const reloaded: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: originalAdminId,
      },
    );
  typia.assert(reloaded);

  TestValidator.equals(
    "reloaded platform admin id matches original",
    reloaded.id,
    originalAdminId,
  );

  TestValidator.equals(
    "reloaded platform admin createdAt matches original createdAt",
    reloaded.createdAt,
    originalCreatedAt,
  );

  TestValidator.equals(
    "reloaded platform admin email should match updated email",
    reloaded.email,
    newEmail,
  );

  TestValidator.equals(
    "reloaded platform admin displayName should match updated displayName",
    reloaded.displayName,
    newDisplayName,
  );

  await TestValidator.predicate(
    "reloaded updatedAt should not be earlier than original updatedAt",
    async () => {
      const originalTime = new Date(originalUpdatedAt).getTime();
      const reloadedTime = new Date(reloaded.updatedAt).getTime();
      return reloadedTime >= originalTime;
    },
  );
}
