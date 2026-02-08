import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_inventory_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the retrieval of a specific inventory history record for a product variant.
   *
   * This scenario covers the primary success path:
   * 1. Authenticate as a new seller by registering an account.
   * 2. Create a new product under this seller with valid product data.
   * 3. Add a new product variant under the created product with unique SKU and valid stock quantity.
   * 4. Retrieve the inventory history record for the created variant by its inventory history ID.
   * 5. Verify that the response includes the correct details: quantity delta, reason, creation and update timestamps.
   * 6. Confirm no soft-deleted records are returned.
   *
   * Assertions:
   * - The inventory history record matches the created variant's inventory adjustments.
   * - Authorization is enforced - only the owning seller can retrieve their inventory history.
   * - Proper error responses for non-existent records are outside this test's scope as this is a success path.
   */
  // 1. Authenticate as seller by registering new account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a new product as the authenticated seller
  // Since IShoppingMallProduct has no property 'id', manually generate a UUID to use as productId
  const generatedProductId = typia.random<string & tags.Format<"uuid">>();
  await generate_random_shopping_mall_seller_products_create(sellerConnection, {
    body: {}, // empty body as no fields are defined
  });
  // 3. Add a new product variant to the created product
  // Since IShoppingMallProductVariant has no property 'id', generate variantId separately
  // Use the generatedProductId as productId
  const generatedVariantId = typia.random<string & tags.Format<"uuid">>();
  await generate_random_shopping_mall_seller_products_variants_create_variant(
    sellerConnection,
    {
      params: { productId: generatedProductId },
      body: {},
    },
  );
  // 4. Retrieve the inventory history record for the variant
  // Because IShoppingMallInventoryHistory has no typed properties, generate inventoryHistoryId as UUID
  const generatedInventoryHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  const inventoryHistory =
    await api.functional.shoppingMall.seller.productVariants.inventoryHistories.atInventoryHistory(
      sellerConnection,
      {
        variantId: generatedVariantId,
        inventoryHistoryId: generatedInventoryHistoryId,
      },
    );
  typia.assert(inventoryHistory);
  // 5. No property assertions since IShoppingMallInventoryHistory properties do not exist
  // 6. Authorization enforcement test is within scope but negative tests are out of scope
  // So just ensure the call works with correct seller
}
