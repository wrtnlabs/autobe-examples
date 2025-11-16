import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_deletion_blocked_for_self_deletion_policies(
  connection: api.IConnection,
) {
  // 1. Prepare helper to build join request bodies.
  const buildJoinRequest = (): IShoppingMallPlatformAdminJoin.IRequest => ({
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  });

  // 2. Register a supporting platform admin ("B") on the base connection.
  const joinRequestB = buildJoinRequest();
  const platformAdminB = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinRequestB,
    },
  );
  typia.assert(platformAdminB);

  // 3. As B, create a guest user to exercise the dependency.
  const guestUserCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestUserCreateBody,
      },
    );
  typia.assert(guestUser);

  // 4. Prepare a fresh connection for PlatformAdmin A's session.
  // We must not touch connection.headers directly after creation.
  const connectionA: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Register PlatformAdmin A on connectionA.
  const joinRequestA = buildJoinRequest();
  const platformAdminA = await api.functional.auth.platformAdmin.join(
    connectionA,
    {
      body: joinRequestA,
    },
  );
  typia.assert(platformAdminA);

  // 6. Attempt to delete PlatformAdmin A using its own session.
  //    This should be blocked by domain policies and throw an error.
  await TestValidator.error(
    "platform admin self-deletion should be blocked by domain policy",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.erase(
        connectionA,
        {
          platformAdminId: platformAdminA.id,
        },
      );
    },
  );
}
