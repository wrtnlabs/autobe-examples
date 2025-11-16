import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBackorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBackorderSetting";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_backorder_settings_requires_existing_inventory_item(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authorized context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Generate a random UUID to be used as a non-existent inventory item id
  const nonexistentInventoryItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build a syntactically valid backorder settings creation payload
  const createBackorderBody = {
    allow_backorder: true,
    max_backorder_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    backorder_message: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallBackorderSetting.ICreate;

  // 4. Attempt to create backorder settings for a non-existent inventory item
  await TestValidator.error(
    "creating backorder settings for non-existent inventory item must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
        connection,
        {
          inventoryItemId: nonexistentInventoryItemId,
          body: createBackorderBody,
        },
      );
    },
  );
}
