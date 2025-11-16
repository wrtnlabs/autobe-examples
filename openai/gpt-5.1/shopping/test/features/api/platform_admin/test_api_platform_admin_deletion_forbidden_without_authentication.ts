import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_deletion_forbidden_without_authentication(
  connection: api.IConnection,
) {
  // 1. Create a guest user to satisfy any guest-related preconditions
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: "E2E-Test-Agent",
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guestUser);

  // 2. Create platform admin A (deletion target)
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminAJoinBody = {
    email: adminAEmail,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 3. Create platform admin B, just to demonstrate multiple admins; this also
  //    refreshes the authenticated context to a different admin.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // 4. Construct an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to erase platform admin A using the unauthenticated connection
  await TestValidator.error(
    "unauthenticated platformAdmin erase must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.erase(
        unauthConn,
        {
          platformAdminId: adminA.id,
        },
      );
    },
  );
}
