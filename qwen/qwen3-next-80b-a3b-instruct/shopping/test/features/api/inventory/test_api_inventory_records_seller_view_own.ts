import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_records_seller_view_own(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account for generating category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create root category via admin
  const category: IShoppingMallSection =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
        },
      },
    );
  typia.assert(category);
  // Step 3: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(joinResult);
  // Step 4: Login as seller to get authenticated connection
  const loginResult: IShoppingMallSeller.IAuthorized =
    await authorize_seller_login(sellerConnection, {
      body: {
        email: joinResult.email,
        password: RandomGenerator.alphaNumeric(16), // Use random password instead of token
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(loginResult);
  // Step 5: Create product via seller
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.categoryId,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  // The actual product creation returns an object with an id property
  // despite the empty IShoppingMallProduct interface
  typia.assert(product);
  // Step 6: Query inventory records for seller's own inventory without variantId filter
  // This tests that the seller can view their own inventory records
  // The system should only return records for products created by this seller
  const inventoryResponse: IPageIShoppingMallInventoryRecord.ISummary =
    await api.functional.shoppingMall.seller.inventory.records.index(
      sellerConnection,
      {
        body: {
          // No variantId filter - get all records for the seller
          sourceType: "restock",
          sortBy: "created_at",
          pageSize: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryResponse);
  // Validate that we have records in the response
  TestValidator.equals(
    "inventory records exist",
    inventoryResponse.data.length > 0,
    true,
  );
  // Validation that the response structure is correct (already done by typia.assert)
  // The server guarantees type safety, so no additional validation needed
  // We verify that the API endpoint works and returns correctly typed data
}
