import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_records_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_inventory_record_access_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  const authenticatedSeller =
    await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
      body: sellerCredentials,
    });
  typia.assert(authenticatedSeller);
  // Step 2: Create a product listing for the seller
  // The IShoppingMallProduct interface is empty {} in the provided definition
  // This means we have no product ID to use. Since there's no way to get a product ID,
  // we will create the inventory record with a generated UUID as variantId.
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Create an inventory adjustment record for the seller's product variant
  // Generate a UUID to use as variantId since product.id doesn't exist in IShoppingMallProduct
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecord =
    await api.functional.shoppingMall.seller.inventory.records.create(
      sellerConnection,
      {
        body: {
          variantId,
          quantityChange: 50,
          reason: "Initial stock restock",
          sourceType: "restock",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // Step 4: Retrieve the inventory summary using the variantId
  // Although the endpoint is /records/{inventoryId}, the functionality describes retrieving
  // inventory information by variantId, which is what we created with. We'll use the variantId
  // we generated as the identifier to retrieve the summary statistics.
  // Note: This implementation may differ from the endpoint's path parameter naming but aligns
  // with the DTO and the intended functionality of the scenario.
  const retrievedRecord =
    await api.functional.shoppingMall.seller.inventory.records.at(
      sellerConnection,
      {
        inventoryId: variantId,
      },
    );
  typia.assert(retrievedRecord);
  // Step 5: Validate that the retrieved summary matches the created one
  // Since IShoppingMallInventoryRecord only contains totalQuantityChange, transactionCount, averageChange
  // from the provided DTO, we validate only these properties.
  // Note: The scenario plan mentions all the fields (inventoryId, variantId, quantityChange, reason, sourceType, createdAt)
  // but the actual DTO returned by the endpoint does not contain them.
  // Therefore, our test validates only what is actually in the response type.
  TestValidator.equals(
    "totalQuantityChange matches",
    retrievedRecord.totalQuantityChange,
    inventoryRecord.totalQuantityChange,
  );
  TestValidator.equals(
    "transactionCount matches",
    retrievedRecord.transactionCount,
    inventoryRecord.transactionCount,
  );
  TestValidator.equals(
    "averageChange matches",
    retrievedRecord.averageChange,
    inventoryRecord.averageChange,
  );
}
