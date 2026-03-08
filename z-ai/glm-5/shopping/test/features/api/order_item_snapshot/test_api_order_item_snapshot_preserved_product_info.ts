import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_item_snapshot_preserved_product_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      { body: { name: `Category_${RandomGenerator.alphabets(8)}` } },
    );
  typia.assert(category);
  // 2. Setup seller with specific shop details
  const sellerConnection: api.IConnection = { host: connection.host };
  const shopName = `Shop_${RandomGenerator.alphabets(6)}`;
  const shopLogo = "https://example.com/logo.png";
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: shopName,
      logo_image: shopLogo,
    },
  });
  typia.assert(sellerAuth);
  // 3. Create product
  const productName = `Product_${RandomGenerator.alphabets(10)}`;
  const productBasePrice = 10000;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: productBasePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create variant with specific options and price override
  const variantSku = `SKU_${RandomGenerator.alphabets(8)}`;
  const variantOptions = { color: "Red", size: "Large" };
  const variantPrice = 15000;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: variantSku,
          optionValues: variantOptions,
          price: variantPrice,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Add inventory to make variant purchasable
  const inventoryQuantity = 100;
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: inventoryQuantity,
        reason: "Initial inventory for snapshot test",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  // 6. Setup customer and add to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  // Record purchase-time values before checkout
  const purchaseTimeProductName = productName;
  const purchaseTimePrice = variantPrice;
  const purchaseTimeShopName = shopName;
  const purchaseTimeShopLogo = shopLogo;
  const purchaseTimeVariantOptions = variantOptions;
  // 7. Complete checkout to create order and snapshot
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: {} satisfies IShoppingMallCheckout.ICreate },
  );
  typia.assert(order);
  // 8. Retrieve order item snapshots
  const snapshotResult =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          orderId: order.id,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResult);
  TestValidator.predicate(
    "at least one snapshot created",
    snapshotResult.data.length > 0,
  );
  const snapshot = snapshotResult.data[0];
  // 9. Verify snapshot preserves purchase-time information
  TestValidator.equals(
    "product name preserved",
    snapshot.product_name,
    purchaseTimeProductName,
  );
  TestValidator.equals("price preserved", snapshot.price, purchaseTimePrice);
  TestValidator.equals(
    "seller shop name preserved",
    snapshot.seller_shop_name,
    purchaseTimeShopName,
  );
  TestValidator.equals(
    "seller logo preserved",
    snapshot.seller_logo_image,
    purchaseTimeShopLogo,
  );
  // 10. Verify variant options are preserved
  TestValidator.predicate(
    "variant options exist",
    snapshot.variant_options.length > 0,
  );
  const variantOptionsMap = new Map(
    snapshot.variant_options.map((opt) => [opt.option_key, opt.option_value]),
  );
  TestValidator.predicate(
    "color option preserved",
    variantOptionsMap.has("color"),
  );
  TestValidator.equals(
    "color value preserved",
    variantOptionsMap.get("color"),
    purchaseTimeVariantOptions.color,
  );
  TestValidator.predicate(
    "size option preserved",
    variantOptionsMap.has("size"),
  );
  TestValidator.equals(
    "size value preserved",
    variantOptionsMap.get("size"),
    purchaseTimeVariantOptions.size,
  );
  // 11. Test partial text search on productName
  const partialNameSearch =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          productName: productName.substring(0, 5),
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(partialNameSearch);
  TestValidator.predicate(
    "partial name search finds snapshot",
    partialNameSearch.data.some((s) => s.id === snapshot.id),
  );
  // 12. Test filtering by sellerShopName
  const shopFilterResult =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          sellerShopName: shopName,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(shopFilterResult);
  TestValidator.predicate(
    "shop name filter finds snapshot",
    shopFilterResult.data.some((s) => s.id === snapshot.id),
  );
  // 13. Test price range filtering - inclusive lower bound
  const priceMinResult =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          priceMin: purchaseTimePrice,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(priceMinResult);
  TestValidator.predicate(
    "priceMin inclusive finds snapshot",
    priceMinResult.data.some((s) => s.id === snapshot.id),
  );
  // 14. Test price range filtering - inclusive upper bound
  const priceMaxResult =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          priceMax: purchaseTimePrice,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(priceMaxResult);
  TestValidator.predicate(
    "priceMax inclusive finds snapshot",
    priceMaxResult.data.some((s) => s.id === snapshot.id),
  );
  // 15. Test price range filtering - exclude if out of range
  const priceOutOfRangeResult =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          priceMin: purchaseTimePrice + 1000,
          priceMax: purchaseTimePrice + 2000,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(priceOutOfRangeResult);
  TestValidator.predicate(
    "price out of range excludes snapshot",
    !priceOutOfRangeResult.data.some((s) => s.id === snapshot.id),
  );
}
