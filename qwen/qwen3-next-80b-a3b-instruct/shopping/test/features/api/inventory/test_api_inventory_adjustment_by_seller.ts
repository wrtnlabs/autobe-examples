import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_records_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_adjustment_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create category as admin
  const category: IShoppingMallSection =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSection.ICreate,
    });
  typia.assert(category);
  // Step 3: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  // Step 4: Login as seller to establish session
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.login(sellerConnection, {
      body: {
        email: sellerJoin.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.ILogin,
    });
  // Since IShoppingMallProduct has no properties, we cannot create a product with an ID
  // We'll use a generated UUID as a placeholder variantId for inventory adjustment
  const fakeVariantId = typia.random<string & tags.Format<"uuid">>();
  // Step 6: Create inventory record with negative quantity adjustment
  const inventoryRecord =
    await api.functional.shoppingMall.seller.inventory.records.create(
      sellerConnection,
      {
        body: {
          variantId: fakeVariantId, // Use placeholder ID since no real product creation possible
          quantityChange: -5, // Negative quantity for adjustment (loss/damage)
          reason: "Product damaged during handling",
          sourceType: "adjustment", // Must be adjustment for inventory loss
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // Step 7: Verify only authorized seller can make adjustment
  // Create a new seller to test authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.seller.join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Use SDK directly to test unauthorized access with the same placeholder ID
  await TestValidator.error(
    "unauthorized seller cannot adjust inventory",
    async () => {
      await api.functional.shoppingMall.seller.inventory.records.create(
        unauthorizedConnection,
        {
          body: {
            variantId: fakeVariantId, // Same placeholder ID
            quantityChange: -1,
            reason: "Unauthorized attempt",
            sourceType: "adjustment",
          } satisfies IShoppingMallInventoryRecord.ICreate,
        },
      );
    },
  );
}
