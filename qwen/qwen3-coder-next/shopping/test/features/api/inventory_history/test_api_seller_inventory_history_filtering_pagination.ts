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

export async function test_api_seller_inventory_history_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerUser: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        shop_name: `Test Shop ${RandomGenerator.name()}`,
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerUser);
  // 2. Create product with variant for testing
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 5 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.MultipleOf<0.01>
        >() satisfies number as number,
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: RandomGenerator.pick([
                  "red",
                  "blue",
                  "green",
                ]) as string,
              },
              {
                option_name: "size",
                option_value: RandomGenerator.pick(["S", "M", "L"]) as string,
              },
            ],
            price_override: null,
            stock_quantity: 100,
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  typia.assert(product.variants.length > 0);
  const variant = product.variants[0];
  // 3. Create multiple inventory history records through restock operations
  const operationCount = 25;
  for (let i = 0; i < operationCount; i++) {
    await api.functional.shoppingMall.seller.variants.add_inventory.addInventory(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          reason: RandomGenerator.pick([
            "restock",
            "adjustment",
            "loss",
          ]) as string,
        } satisfies IShoppingMallProductVariant.IRestock,
      },
    );
  }
  // 4. Test pagination with default parameters (page=1, limit=20)
  const page1 =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(page1);
  TestValidator.equals("first page has records", page1.data.length > 0, true);
  TestValidator.equals(
    "first page records count",
    page1.data.length <= page1.pagination.limit,
    true,
  );
  TestValidator.equals(
    "pagination records matches total",
    page1.data.length <= page1.pagination.records,
    true,
  );
  // 5. Test pagination with explicit page=1, limit=10
  const page1Limited =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(page1Limited);
  TestValidator.equals(
    "limit 10 first page size",
    page1Limited.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "first page pagination",
    page1Limited.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", page1Limited.pagination.limit, 10);
  TestValidator.predicate(
    "first page has records",
    () => page1Limited.data.length > 0,
  );
  // 6. Test second page to verify different subset is returned
  const page2 =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: { page: 2, limit: 10 },
      },
    );
  typia.assert(page2);
  TestValidator.equals("second page pagination", page2.pagination.current, 2);
  TestValidator.equals("second page limit", page2.pagination.limit, 10);
  // Verify pages are different if both have data
  if (page1Limited.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "pages are different",
      JSON.stringify(page1Limited.data),
      JSON.stringify(page2.data),
    );
  }
  // 7. Test date range filtering
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  const twoHoursAgo = new Date(now.getTime() - 2 * oneHour);
  const thirtyMinutesAgo = new Date(now.getTime() - 0.5 * oneHour);
  const filteredByDate =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          created_at_range: [
            twoHoursAgo.toISOString(),
            thirtyMinutesAgo.toISOString(),
          ],
        },
      },
    );
  typia.assert(filteredByDate);
  // 8. Test reason code filtering
  const orderReason =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          reason: ["restock"],
        },
      },
    );
  typia.assert(orderReason);
  const adjustmentReason =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          reason: ["adjustment"],
        },
      },
    );
  typia.assert(adjustmentReason);
  // 9. Test combined filtering (date + reason)
  const combinedFiltered =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          created_at_range: [twoHoursAgo.toISOString(), now.toISOString()],
          reason: ["restock", "adjustment"],
        },
      },
    );
  typia.assert(combinedFiltered);
  // 10. Verify pagination metadata accuracy
  const fullPage =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: { page: 1, limit: 100 },
      },
    );
  typia.assert(fullPage);
  const totalPages = Math.ceil(
    fullPage.pagination.records / fullPage.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages matches",
    fullPage.pagination.pages,
    totalPages,
  );
  TestValidator.predicate("has records", () => fullPage.pagination.records > 0);
  // 11. Verify records contain expected properties
  if (fullPage.data.length > 0) {
    const sample = fullPage.data[0];
    TestValidator.equals("has id", typeof sample.id, "string");
    TestValidator.equals(
      "has quantity_change",
      typeof sample.quantity_change,
      "number",
    );
    TestValidator.equals("has reason", typeof sample.reason, "string");
    TestValidator.equals("has created_at", typeof sample.created_at, "string");
    TestValidator.equals(
      "has shopping_mall_product_variant_id",
      typeof sample.shopping_mall_product_variant_id,
      "string",
    );
  }
}
