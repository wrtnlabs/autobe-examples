import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify minimal, no-op update behavior for a guest user using platform admin
 * APIs.
 *
 * Business intent:
 *
 * - A platform administrator can perform an update call on a guest user by
 *   sending an empty JSON object as the request body when all update fields are
 *   optional.
 * - Such a call should be safe and idempotent for business fields
 *   (temporary_identifier, user_agent, deleted_at) and must not corrupt or
 *   reset them.
 * - System timestamps should behave consistently: created_at must remain
 *   unchanged, while updated_at may advance or remain equal but must never go
 *   backwards.
 *
 * Test workflow:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated connection (SDK will set Authorization header).
 * 2. Create a guest user via POST /shoppingMall/platformAdmin/guestUsers using a
 *    valid IShoppingMallGuestUser.ICreate payload.
 * 3. Immediately call PUT /shoppingMall/platformAdmin/guestUsers/{guestUserId}
 *    with an empty object body {} as IShoppingMallGuestUser.IUpdate.
 * 4. Assert that all business fields are unchanged and idempotent.
 * 5. Assert that created_at is unchanged and updated_at is not earlier than the
 *    original updated_at.
 */
export async function test_api_platform_admin_update_guest_user_with_minimal_payload(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a guest user with deterministic fields
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const created: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(created);

  const originalId = created.id;
  const originalTemporaryIdentifier = created.temporary_identifier;
  const originalUserAgent = created.user_agent;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalDeletedAt = created.deleted_at;

  // 3. Minimal update: empty body
  const minimalUpdateBody = {} satisfies IShoppingMallGuestUser.IUpdate;

  const updated: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId: originalId,
        body: minimalUpdateBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(updated);

  // 4. Validate business fields are unchanged
  TestValidator.equals(
    "guest user id should remain unchanged after minimal update",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "temporary_identifier should remain unchanged after minimal update",
    updated.temporary_identifier,
    originalTemporaryIdentifier,
  );

  TestValidator.equals(
    "user_agent should remain unchanged after minimal update",
    updated.user_agent,
    originalUserAgent,
  );

  TestValidator.equals(
    "deleted_at should remain unchanged after minimal update (including null/undefined)",
    updated.deleted_at,
    originalDeletedAt,
  );

  // 5. Validate timestamp behavior
  TestValidator.equals(
    "created_at must remain unchanged after minimal update",
    updated.created_at,
    originalCreatedAt,
  );

  // updated_at must not go backwards - allow equal or greater.
  const updatedAtNotEarlier = updated.updated_at >= originalUpdatedAt;
  TestValidator.predicate(
    "updated_at after minimal update should not be earlier than original updated_at",
    updatedAtNotEarlier,
  );
}
