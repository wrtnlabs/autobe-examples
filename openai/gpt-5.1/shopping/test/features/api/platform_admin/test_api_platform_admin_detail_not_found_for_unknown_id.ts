import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    password: "Str0ngP@ssw0rd!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a guest user as baseline identity data
  const guestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestBody },
    );
  typia.assert(guestUser);

  // 3. Positive control: fetch detail of the real existing admin
  const existingDetail: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      { platformAdminId: authorizedAdmin.id },
    );
  typia.assert(existingDetail);

  TestValidator.equals(
    "existing admin detail should match authorized admin id",
    existingDetail.id,
    authorizedAdmin.id,
  );

  // 4. Generate a UUID that does not correspond to any existing admin
  let unknownId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownId === authorizedAdmin.id) {
    // Extremely unlikely, but loop until we get a different one
    do {
      unknownId = typia.random<string & tags.Format<"uuid">>();
    } while (unknownId === authorizedAdmin.id);
  }

  // 5. Call detail endpoint with the non-existent id and expect an error
  await TestValidator.error(
    "non-existent admin id should result in error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
        connection,
        { platformAdminId: unknownId },
      );
    },
  );
}
