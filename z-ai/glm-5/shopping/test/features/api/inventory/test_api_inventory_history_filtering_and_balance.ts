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

export async function test_api_inventory_history_filtering_and_balance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product (using random category_id since no category endpoint available)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<number & tags.Minimum<1>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10).toUpperCase(),
          price: typia.random<number & tags.Minimum<1>>() satisfies number as number,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
          ],
          stockQuantity: 0, // Start with 0 to have full control over history
        },
      },
    );
  typia.assert(variant);
  // 4. Add inventory (restock) - creates first history record
  const addHistory1 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          reason: "restock",
        },
      },
    );
  typia.assert(addHistory1);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Subtract inventory (loss) - creates second history record
  const subtractHistory =
    await api.functional.shoppingMall.seller.sellers.me.variants.inventory.subtract.subtractInventory(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantity: 10,
          reason: "loss",
        } satisfies IShoppingMallProductInventoryHistory.ISubtract,
      },
    );
  typia.assert(subtractHistory);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Add more inventory (restock) - creates third history record
  const addHistory2 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 50,
          reason: "restock",
        },
      },
    );
  typia.assert(addHistory2);
  // 7. Query all history records and verify running balance calculation
  const allHistory =
    await api.functional.shoppingMall.seller.variants.inventory.histories.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {} satisfies IShoppingMallProductInventoryHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  // Verify we have 3 history records
  TestValidator.equals("history count", allHistory.data.length, 3);
  // Records are ordered by created_at descending (most recent first)
  // Running balance is computed for each record as cumulative sum at that point
  // Changes in order: [50 (restock), -10 (loss), 100 (restock)]
  // Running balances computed: [140, 90, 100] - each reflects stock level after that change
  const expectedChanges = [50, -10, 100];
  const expectedBalances = [140, 90, 100];
  for (let i = 0; i < allHistory.data.length; i++) {
    TestValidator.equals(
      `quantity change ${i}`,
      allHistory.data[i].quantityChange,
      expectedChanges[i],
    );
  }
  for (let i = 0; i < allHistory.data.length; i++) {
    TestValidator.equals(
      `running balance ${i}`,
      allHistory.data[i].runningBalance,
      expectedBalances[i],
    );
  }
  // 8. Test filtering by reason type (restock only)
  const restockHistory =
    await api.functional.shoppingMall.seller.variants.inventory.histories.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          reason: "restock",
        } satisfies IShoppingMallProductInventoryHistory.IRequest,
      },
    );
  typia.assert(restockHistory);
  // Should have 2 restock records
  TestValidator.equals("restock count", restockHistory.data.length, 2);
  TestValidator.predicate(
    "all restock records have positive change",
    restockHistory.data.every((h) => h.quantityChange > 0),
  );
  // 9. Test filtering by reason type (loss only)
  const lossHistory =
    await api.functional.shoppingMall.seller.variants.inventory.histories.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          reason: "loss",
        } satisfies IShoppingMallProductInventoryHistory.IRequest,
      },
    );
  typia.assert(lossHistory);
  // Should have 1 loss record
  TestValidator.equals("loss count", lossHistory.data.length, 1);
  TestValidator.equals(
    "loss quantity change",
    lossHistory.data[0].quantityChange,
    -10,
  );
  // 10. Test date range filtering
  const fromDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  const toDate = new Date().toISOString();
  const dateFilteredHistory =
    await api.functional.shoppingMall.seller.variants.inventory.histories.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          fromDate,
          toDate,
        } satisfies IShoppingMallProductInventoryHistory.IRequest,
      },
    );
  typia.assert(dateFilteredHistory);
  // All records should be within the date range
  TestValidator.equals(
    "date filtered count",
    dateFilteredHistory.data.length,
    3,
  );
  // 11. Test pagination
  const page1 =
    await api.functional.shoppingMall.seller.variants.inventory.histories.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallProductInventoryHistory.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 count", page1.data.length, 2);
  TestValidator.equals("total records", page1.pagination.records, 3);
  TestValidator.equals("total pages", page1.pagination.pages, 2);
  TestValidator.equals("current page", page1.pagination.current, 1);
  const page2 =
    await api.functional.shoppingMall.seller.variants.inventory.histories.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallProductInventoryHistory.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 count", page2.data.length, 1);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 12. Verify final stock calculation
  // Changes: +100, -10, +50 = 140 total
  let cumulativeSum = 0;
  const sortedByDate = [...allHistory.data].reverse(); // Reverse to get chronological order
  for (const record of sortedByDate) {
    cumulativeSum += record.quantityChange;
  }
  // Final stock should be 140 (100 - 10 + 50)
  TestValidator.equals("final stock", cumulativeSum, 140);
}