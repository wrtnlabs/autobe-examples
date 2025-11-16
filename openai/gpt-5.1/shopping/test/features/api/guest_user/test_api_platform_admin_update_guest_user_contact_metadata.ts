import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_update_guest_user_contact_metadata(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a guest user as this platform admin
  const initialTemporaryIdentifier = RandomGenerator.alphaNumeric(24);
  const initialUserAgent = RandomGenerator.paragraph({ sentences: 3 });

  const guestCreateBody = {
    temporary_identifier: initialTemporaryIdentifier,
    user_agent: initialUserAgent,
  } satisfies IShoppingMallGuestUser.ICreate;

  const createdGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(createdGuest);

  // Capture original immutable-ish fields for later comparison
  const originalId = createdGuest.id;
  const originalCreatedAt = createdGuest.created_at;
  const originalUpdatedAt = createdGuest.updated_at;
  const originalDeletedAt = createdGuest.deleted_at ?? null;

  // 3. Prepare update payload: change temporary_identifier and user_agent, keep deleted_at null
  const updatedTemporaryIdentifier = RandomGenerator.alphaNumeric(24);
  const updatedUserAgent = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    temporary_identifier: updatedTemporaryIdentifier,
    user_agent: updatedUserAgent,
    deleted_at: null,
  } satisfies IShoppingMallGuestUser.IUpdate;

  const updatedGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId: createdGuest.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(updatedGuest);

  // 4. Validate that immutable fields are preserved
  TestValidator.equals(
    "guest id should remain unchanged after update",
    updatedGuest.id,
    originalId,
  );
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedGuest.created_at,
    originalCreatedAt,
  );

  // updated_at should change to reflect the update (best-effort check)
  TestValidator.notEquals(
    "updated_at should change after updating guest user",
    updatedGuest.updated_at,
    originalUpdatedAt,
  );

  // 5. Validate that updated mutable fields match new values
  TestValidator.equals(
    "temporary_identifier should be updated to new value",
    updatedGuest.temporary_identifier,
    updatedTemporaryIdentifier,
  );
  TestValidator.equals(
    "user_agent should be updated to new value",
    updatedGuest.user_agent,
    updatedUserAgent,
  );

  // deleted_at should remain null (or set to null explicitly)
  TestValidator.equals(
    "deleted_at should remain or be set to null after non-delete update",
    updatedGuest.deleted_at ?? null,
    null,
  );
}
