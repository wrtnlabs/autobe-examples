import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductInventoryHistory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that a seller can successfully retrieve paginated inventory history
 * for their product variant.
 *
 * This test validates the complete inventory audit trail retrieval workflow:
 * 1. Seller authentication via join endpoint
 * 2. Product creation with required fields
 * 3. Product variant creation with SKU and options
 * 4. Inventory restock to create history record
 * 5. Inventory history retrieval and validation
 */
export async function test_api_inventory_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant with options
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          price: null,
          optionValues: [
            {
              key: "color",
              value: "Red",
            } satisfies IShoppingMallProductVariantOption.ICreate,
            {
              key: "size",
              value: "Large",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variant);
  // 4. Add inventory (restock) to create a history record
  const restockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const restockReason = "Initial restock for testing";
  const inventoryHistory =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: restockQuantity,
          reason: restockReason,
        },
      },
    );
  typia.assert(inventoryHistory);
  // 5. Retrieve inventory history with pagination
  const historyPage =
    await api.functional.shoppingMall.seller.variants.inventory.histories.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductInventoryHistory.IRequest,
      },
    );
  typia.assert(historyPage);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    () => historyPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => historyPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    () => historyPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => historyPage.pagination.pages >= 0,
  );
  // 7. Validate history data
  TestValidator.predicate(
    "history data exists",
    () => historyPage.data.length > 0,
  );
  // 8. Validate the history record details
  const historyRecord = historyPage.data[0];
  TestValidator.equals(
    "quantity change matches restock",
    historyRecord.quantityChange,
    restockQuantity,
  );
  TestValidator.equals("reason matches", historyRecord.reason, restockReason);
  TestValidator.equals(
    "running balance equals quantity",
    historyRecord.runningBalance,
    restockQuantity,
  );
}
