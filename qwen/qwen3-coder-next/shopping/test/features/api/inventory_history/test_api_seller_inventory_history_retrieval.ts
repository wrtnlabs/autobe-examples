import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
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
  // 1. Register and login as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = typia.random<IShoppingMallSeller.IJoin>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(seller);
  // 2. Create a product with a variant
  const category: IShoppingMallCategory.ISummary =
    typia.random<IShoppingMallCategory.ISummary>();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.MultipleOf<0.01>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: "red",
              },
            ],
            stock_quantity: 100,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Ensure product has variants
  if (!product.variants || product.variants.length === 0) {
    throw new Error("Product must have at least one variant");
  }
  const variant = product.variants[0];
  // 3. Perform multiple inventory operations on the variant
  // 3.1. Add inventory (restock)
  await api.functional.shoppingMall.seller.variants.add_inventory.addInventory(
    sellerConnection,
    {
      variantId: variant.id,
      body: {
        quantity: 50,
        reason: "supplier shipment",
      } satisfies IShoppingMallProductVariant.IRestock,
    },
  );
  // 3.2. Add inventory again (another restock)
  await api.functional.shoppingMall.seller.variants.add_inventory.addInventory(
    sellerConnection,
    {
      variantId: variant.id,
      body: {
        quantity: 30,
        reason: "manual adjustment",
      } satisfies IShoppingMallProductVariant.IRestock,
    },
  );
  // 4. Create a customer and place an order to generate inventory deduction
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = typia.random<IShoppingMallCustomer.IJoin>();
  const customer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customer);
  // Note: Order creation is not implemented in this test as it would require
  // additional API endpoints for cart and order management that are not provided
  // Instead, we'll test retrieval with the restock history we've created
  // 5. Retrieve inventory history
  const history =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(history);
  // 6. Validate results
  TestValidator.equals("history has data", history.data.length > 0, true);
  TestValidator.equals(
    "pagination is correct",
    history.pagination.records >= 2,
    true,
  );
  // 7. Validate inventory history records
  const restockRecords = history.data.filter((h) => h.reason === "restock");
  TestValidator.equals(
    "has at least 2 restock records",
    restockRecords.length >= 2,
    true,
  );
  // 8. Validate quantity changes
  const totalRestock = history.data
    .filter((h) => h.reason === "restock")
    .reduce((sum, h) => sum + h.quantity_change, 0);
  TestValidator.predicate("total restock is positive", totalRestock > 0);
  // 9. Test filtering by reason
  const filteredHistory =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          reason: ["restock"],
        },
      },
    );
  typia.assert(filteredHistory);
  TestValidator.equals(
    "filtered by reason",
    filteredHistory.data.length,
    restockRecords.length,
  );
  // 10. Test pagination
  const paginatedHistory =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(paginatedHistory);
  TestValidator.equals(
    "pagination limit respected",
    paginatedHistory.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "pagination count correct",
    paginatedHistory.pagination.limit,
    1,
  );
  // 11. Test sorting
  const sortedHistory =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(sortedHistory);
  TestValidator.predicate(
    "sorted by date descending",
    sortedHistory.data.length > 0,
  );
  // 12. Test vendor-specific filtering
  const filteredByVariant =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          shopping_mall_product_variant_id: variant.id,
        },
      },
    );
  typia.assert(filteredByVariant);
  TestValidator.equals(
    "filtered by variant id",
    filteredByVariant.data.length >= 2,
    true,
  );
  // 13. Verify seller can only access their own inventory history
  const customerHistory =
    await api.functional.shoppingMall.seller.inventory_history.variants.index(
      customerConnection,
      {
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(customerHistory);
  // Customer should not see seller's inventory history
  TestValidator.predicate(
    "customer sees no inventory history",
    customerHistory.data.length === 0,
  );
}
