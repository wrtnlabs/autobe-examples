import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_inventory_item_delete_nonexistent_item(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain an authenticated session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    // For ip we deliberately omit it so it remains undefined, which is allowed.
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Generate a random UUID that should not correspond to any existing inventory item.
  const nonexistentInventoryItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to erase the non-existent inventory item and assert that an error occurs.
  await TestValidator.error(
    "deleting a non-existent inventory item should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.erase(
        connection,
        {
          inventoryItemId: nonexistentInventoryItemId,
        },
      );
    },
  );

  // 4. Optional sanity check: admin object is still structurally valid after the failed deletion attempt.
  //    This does not perform an additional API call because we have no safe, side-effect-free
  //    platformAdmin read endpoint in the provided materials.
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
}
