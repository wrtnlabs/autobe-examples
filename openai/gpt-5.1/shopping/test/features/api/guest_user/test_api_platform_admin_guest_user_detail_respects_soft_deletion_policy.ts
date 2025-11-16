import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_guest_user_detail_respects_soft_deletion_policy(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shopping-mall.example.com/join",
    referrer: "https://admin.shopping-mall.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new guest user as this platform admin
  const createGuestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const createdGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: createGuestBody,
      },
    );
  typia.assert(createdGuest);

  // 3. Immediately load the guest user via detail endpoint
  const loadedGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.at(connection, {
      guestUserId: createdGuest.id,
    });
  typia.assert(loadedGuest);

  // 4. Business assertions
  TestValidator.equals(
    "guest user detail should return the same id as created record",
    loadedGuest.id,
    createdGuest.id,
  );

  // For a freshly created guest user, deleted_at must not be set.
  TestValidator.predicate(
    "freshly created guest user should not have deleted_at set",
    loadedGuest.deleted_at === null || loadedGuest.deleted_at === undefined,
  );

  // Document expectation: because we cannot soft-delete via public API, this
  // test only asserts the active-case semantics and the shape of deleted_at.
}
