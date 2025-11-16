import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_credentials_view_nonexistent_admin(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain a valid admin session / token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Generate a random UUID that is different from the real admin id
  const nonexistentAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Ensure it is not equal to the real admin id to avoid flakiness
  const targetId =
    nonexistentAdminId === admin.id
      ? typia.random<string & tags.Format<"uuid">>()
      : nonexistentAdminId;

  TestValidator.notEquals(
    "non-existent admin id must differ from real admin id",
    targetId,
    admin.id,
  );

  // 3. Call credentials.at with the non-existent id and expect 404 HttpError
  await TestValidator.httpError(
    "requesting credentials for non-existent admin results in 404",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.credentials.at(
        connection,
        {
          platformAdminId: targetId,
        },
      );
    },
  );
}
