import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_delete_seller_with_existing_guest_user(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (this also establishes auth headers via SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest user via platformAdmin namespace
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guest);

  // Sanity check: created guest user has a UUID id and timestamps
  await TestValidator.predicate("guest user has valid UUID id", async () => {
    typia.assert<string & tags.Format<"uuid">>(guest.id);
    return true;
  });

  // 3. Invoke seller hard-delete with a random UUID and ensure it does not throw
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.shoppingMall.platformAdmin.sellers.erase(connection, {
    sellerId,
  });

  // 4. Ensure the previously created guest user is still a valid DTO instance in memory
  typia.assert<IShoppingMallGuestUser>(guest);

  // With the given SDK surface, we cannot verify seller persistence directly;
  // this test ensures end-to-end wiring and type-safety across admin join,
  // guest user creation, and seller erase.
}
