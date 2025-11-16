import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin ability to soft-delete and then restore a guest user.
 *
 * ## Business context
 *
 * Platform administrators manage guest user identities stored in
 * `shopping_mall_guestuser`. Instead of hard deleting rows, the system supports
 * a soft delete mechanism via the nullable `deleted_at` column:
 *
 * - Active guest: `deleted_at` is null (or effectively unset)
 * - Soft-deleted guest: `deleted_at` is a timestamp of logical deletion
 *
 * This test verifies that a platform admin can:
 *
 * 1. Create a guest user
 * 2. Soft delete the guest by setting `deleted_at` to a timestamp through the
 *    update endpoint
 * 3. Restore (undelete) the guest by setting `deleted_at` back to null
 *
 * ## Steps
 *
 * 1. Bootstrap a platform admin session using POST /auth/platformAdmin/join.
 *
 *    - Build an IShoppingMallPlatformAdminJoin.IRequest body with random but valid
 *         email, name, password, and URLs.
 *    - Rely on the SDK to install the Authorization header on the shared connection.
 * 2. Create a guest user via POST /shoppingMall/platformAdmin/guestUsers.
 *
 *    - Use IShoppingMallGuestUser.ICreate with a random temporary identifier and
 *         user agent.
 *    - Assert the response type and basic invariants (id, timestamps present).
 * 3. Soft delete the guest via PUT /shoppingMall/platformAdmin/guestUsers/{id}.
 *
 *    - Build an IShoppingMallGuestUser.IUpdate payload with `deleted_at` set to a
 *         current ISO timestamp.
 *    - Assert that:
 *
 *         - Id is unchanged
 *         - Created_at is unchanged
 *         - Updated_at has changed
 *         - Deleted_at is now the non-null timestamp sent in the request.
 * 4. Restore the guest via another PUT update with `deleted_at: null`.
 *
 *    - Assert that:
 *
 *         - Id is still unchanged
 *         - Created_at is still unchanged
 *         - Deleted_at is now null
 *         - Updated_at is newer than the soft-deleted version.
 */
export async function test_api_platform_admin_soft_delete_and_restore_guest_user(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a guest user
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: "Mozilla/5.0 (E2E Test Guest)",
  } satisfies IShoppingMallGuestUser.ICreate;

  const created: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(created);

  TestValidator.predicate(
    "new guest should have created_at timestamp",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "new guest should have updated_at timestamp",
    created.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is initially null or undefined",
    () => created.deleted_at === null || created.deleted_at === undefined,
  );

  const originalUpdatedAt = created.updated_at;

  // 3. Soft delete by setting deleted_at to current time
  const softDeleteTimestamp = new Date().toISOString();

  const softDeleteBody = {
    deleted_at: softDeleteTimestamp,
  } satisfies IShoppingMallGuestUser.IUpdate;

  const softDeleted: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId: created.id,
        body: softDeleteBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(softDeleted);

  TestValidator.equals(
    "guest user id stable after soft delete",
    softDeleted.id,
    created.id,
  );
  TestValidator.equals(
    "created_at unchanged after soft delete",
    softDeleted.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change after soft delete",
    softDeleted.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "deleted_at equals requested soft delete timestamp",
    () => softDeleted.deleted_at === softDeleteTimestamp,
  );

  // 4. Restore by setting deleted_at back to null
  const restoreBody = {
    deleted_at: null,
  } satisfies IShoppingMallGuestUser.IUpdate;

  const restored: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId: created.id,
        body: restoreBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(restored);

  TestValidator.equals(
    "guest user id stable after restore",
    restored.id,
    created.id,
  );
  TestValidator.equals(
    "created_at unchanged after restore",
    restored.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "deleted_at cleared to null after restore",
    restored.deleted_at,
    null,
  );

  const softDeletedUpdatedAtMillis = new Date(softDeleted.updated_at).getTime();
  const restoredUpdatedAtMillis = new Date(restored.updated_at).getTime();

  TestValidator.predicate(
    "restored.updated_at is later than softDeleted.updated_at",
    restoredUpdatedAtMillis >= softDeletedUpdatedAtMillis,
  );
}
