import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_delete_soft_deleted_guest_user(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized connection
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest user
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const createdGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestCreateBody },
    );
  typia.assert(createdGuest);

  // basic sanity: created guest has same temporary_identifier
  TestValidator.equals(
    "created guest should reflect input temporary_identifier",
    createdGuest.temporary_identifier,
    guestCreateBody.temporary_identifier,
  );

  // ensure deleted_at is initially null or undefined (not soft-deleted yet)
  TestValidator.predicate(
    "created guest should not be soft-deleted initially",
    createdGuest.deleted_at === null || createdGuest.deleted_at === undefined,
  );

  // 3. Soft delete the guest user by setting deleted_at to a past timestamp
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const guestUpdateBody = {
    deleted_at: pastDate,
  } satisfies IShoppingMallGuestUser.IUpdate;

  const softDeletedGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId: createdGuest.id,
        body: guestUpdateBody,
      },
    );
  typia.assert(softDeletedGuest);

  // verify deleted_at set
  TestValidator.equals(
    "soft-deleted guest should have deleted_at set to requested value",
    softDeletedGuest.deleted_at,
    guestUpdateBody.deleted_at,
  );

  // 4. Hard delete (erase) the guest user; should succeed even when already soft-deleted
  await api.functional.shoppingMall.platformAdmin.guestUsers.erase(connection, {
    guestUserId: createdGuest.id,
  });

  // 5. We cannot call a GET-by-id endpoint (not provided), so the best we can
  //    do is to assert that erase completed without throwing and that previous
  //    lifecycle transitions behaved correctly. The absence of an error is our
  //    signal that hard delete tolerates soft-deleted records.
  TestValidator.predicate(
    "hard delete of an already soft-deleted guest user should complete without error",
    true,
  );
}
