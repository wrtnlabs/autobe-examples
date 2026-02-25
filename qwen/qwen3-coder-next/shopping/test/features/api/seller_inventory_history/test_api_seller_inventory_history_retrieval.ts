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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_inventory_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url:
      Math.random() > 0.5 ? null : RandomGenerator.alphaNumeric(8) + ".png",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuthorized);
  // Step 2: Create product with variant
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        shopping_mall_category_id: "c87a8e5c-0e4f-4c5d-9a1b-2f3e4d5a6b7c", // Placeholder - would need real category
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100>
        >(),
        variants: [
          {
            sku_code: "INV-HIST-" + RandomGenerator.alphaNumeric(6),
            option_values: [
              {
                option_name: "size",
                option_value: "M",
              },
            ],
            stock_quantity: 10,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Get the variant ID from the created product
  const variantId = product.variants[0].id;
  // Step 3: Create multiple inventory history records
  const inventoryRecords: number[] = [];
  for (let i = 0; i < 5; i++) {
    const quantity = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >();
    await api.functional.shoppingMall.seller.variants.add_inventory.addInventory(
      sellerConnection,
      {
        variantId: variantId,
        body: {
          quantity: quantity,
          reason: "Test restock " + (i + 1),
        } satisfies IShoppingMallProductVariant.IRestock,
      },
    );
    inventoryRecords.push(quantity);
  }
  // Step 4: Retrieve inventory history with pagination
  const historyResponse =
    await api.functional.shoppingMall.seller.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        variantId: variantId,
      },
    );
  typia.assert(historyResponse);
  // Step 5: Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    historyResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination has current",
    historyResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    historyResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    historyResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    historyResponse.pagination.pages >= 0,
    true,
  );
  // Step 6: Validate data array structure
  TestValidator.equals("has data array", historyResponse.data !== null, true);
  TestValidator.predicate(
    "data array exists",
    Array.isArray(historyResponse.data),
  );
  // Step 7: Validate pagination accuracy
  const expectedRecords = inventoryRecords.length;
  TestValidator.equals(
    "pagination records count matches",
    historyResponse.pagination.records,
    expectedRecords,
  );
  const expectedPages =
    Math.ceil(expectedRecords / historyResponse.pagination.limit) || 1;
  TestValidator.equals(
    "pagination pages count matches",
    historyResponse.pagination.pages,
    expectedPages,
  );
}
