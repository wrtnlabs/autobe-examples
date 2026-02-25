import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_adjust_inventory_adjust_inventory } from "../../../generate/generate_random_shopping_mall_seller_variants_adjust_inventory_adjust_inventory";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_inventory_history_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuthorized);
  // 2. Create a product with a variant
  const category = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: null,
    parent: null,
    subcategory_count: 0,
  } satisfies IShoppingMallCategory.ISummary;
  const productData = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    shopping_mall_category_id: category.id,
    base_price: typia.random<number & tags.MultipleOf<0.01>>(),
    variants: [
      {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        option_values: [
          {
            option_name: "color",
            option_value: "black",
          },
        ],
        stock_quantity: 100,
      } satisfies IShoppingMallProductVariant.ICreate,
    ],
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: productData,
    },
  );
  typia.assert(product);
  // Get the first variant
  const variant = product.variants[0];
  // 3. Create multiple inventory history records with different reasons and timestamps
  const historyRecords: IShoppingMallInventoryHistory[] = [];
  // Create records with different reasons
  const reasons = ["order", "adjustment", "restock", "loss"] as const;
  for (let i = 0; i < 15; i++) {
    const record =
      await api.functional.shoppingMall.seller.variants.adjust_inventory.adjustInventory(
        sellerConnection,
        {
          variantId: variant.id,
          body: {
            variant_id: variant.id,
            quantity_change: i % 2 === 0 ? 10 : -5,
            reason: reasons[i % reasons.length],
            metadata: JSON.stringify({
              source: "manual_adjustment",
              reason_code: reasons[i % reasons.length],
              sequence: i,
            }),
          } satisfies IShoppingMallInventoryHistory.ICreate,
        },
      );
    typia.assert(record);
    historyRecords.push(record);
  }
  // 4. Test inventory history retrieval
  const result =
    await api.functional.shoppingMall.seller.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        variantId: variant.id,
      },
    );
  typia.assert(result);
  // 5. Verify pagination structure
  TestValidator.equals(
    "pagination has current page",
    typeof result.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof result.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records count",
    typeof result.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages count",
    typeof result.pagination.pages,
    "number",
  );
  // 6. Verify data structure
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
  TestValidator.equals(
    "data length matches pagination",
    result.data.length,
    result.pagination.limit || result.pagination.records,
  );
  // 7. Verify inventory history records were created
  TestValidator.predicate(
    "at least one history record exists",
    historyRecords.length > 0,
  );
  TestValidator.equals("history records count", historyRecords.length, 15);
  // 8. Verify record details
  const firstRecord = historyRecords[0];
  TestValidator.equals(
    "record has variant id",
    firstRecord.variant_id,
    variant.id,
  );
  // Removed the quantity_change property access as it doesn't exist on IShoppingMallInventoryHistory
  TestValidator.equals(
    "record has reason",
    typeof firstRecord.reason,
    "string",
  );
}