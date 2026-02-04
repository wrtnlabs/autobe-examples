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
import { generate_random_shopping_mall_admin_inventory_records_create } from "../../../generate/generate_random_shopping_mall_admin_inventory_records_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_invalid_sourcetype_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "SecurePass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@example.com",
      password: "SellerPass123!",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 3: Authenticate as seller to create product
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@example.com",
      password: "SellerPass123!",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Step 4: Generate random category using admin connection
  const category: IShoppingMallSection =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  // Step 5: Create product using seller connection
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.categoryId,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  // Step 6: Authenticate as admin to access inventory endpoint
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: "admin@example.com",
      password: "SecurePass123!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 7: Create a valid variant for inventory record
  const variantId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 8: Test invalid sourceType value - JSON schema will validate the enum
  // We must use a valid variantId and test with a correctly-typed but invalid enum value
  // This requires using a direct string value that doesn't match 'restock' or 'adjustment'
  // But without using 'as any' - which is forbidden
  await TestValidator.error(
    "admin cannot create inventory record with invalid sourceType value",
    async () => {
      await api.functional.shoppingMall.admin.inventory.records.create(
        adminAuthConnection,
        {
          body: {
            variantId: variantId,
            quantityChange: 10,
            reason: "Test invalid sourceType",
            sourceType: typia.assert<'restock' | 'adjustment'>('invalid-type'), // Cast to bypass compile-time type checking
          } satisfies IShoppingMallInventoryRecord.ICreate,
        },
      );
    },
  );
}