import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_item_detail_own_order_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(1),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create variant with specific options
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: { color: "Red", size: "Large" },
          price: 29999,
        },
      },
    );
  typia.assert(variant);
  // 4. Add inventory
  const inventory =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock for test",
        },
      },
    );
  typia.assert(inventory);
  // 5. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 6. Add variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Create order via checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 8. Get order item ID from order
  const orderItemId = order.orderItems[0].id;
  // 9. Retrieve order item details
  const orderItemDetail =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItemId,
      },
    );
  typia.assert(orderItemDetail);
  // 10. Validate product details
  TestValidator.equals("product id", orderItemDetail.product.id, product.id);
  TestValidator.equals(
    "product name",
    orderItemDetail.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base price",
    orderItemDetail.product.base_price,
    product.base_price,
  );
  // 11. Validate variant details
  TestValidator.equals("variant id", orderItemDetail.variant.id, variant.id);
  TestValidator.equals(
    "variant sku code",
    orderItemDetail.variant.skuCode,
    variant.sku_code,
  );
  // 12. Validate order item details
  TestValidator.equals("quantity purchased", orderItemDetail.quantity, 2);
  TestValidator.equals("unit price", orderItemDetail.price, 29999);
  TestValidator.equals("fulfillment status", orderItemDetail.status, "paid");
  // 13. Validate seller information
  TestValidator.equals("seller id", orderItemDetail.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller shop name",
    orderItemDetail.seller.shop_name,
    sellerAuth.shop_name,
  );
  // 14. Validate order ownership
  TestValidator.equals(
    "order customer id",
    orderItemDetail.order.customer?.id,
    customerAuth.id,
  );
  // 15. Validate shipment is null (not yet shipped)
  TestValidator.equals(
    "shipment null for unshipped item",
    orderItemDetail.shipment,
    null,
  );
  // 16. Validate immutable snapshot preserves purchase-time data
  TestValidator.equals(
    "snapshot product name",
    orderItemDetail.snapshot.productName,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description",
    orderItemDetail.snapshot.productDescription,
    product.description,
  );
  TestValidator.equals(
    "snapshot seller shop name",
    orderItemDetail.snapshot.sellerShopName,
    sellerAuth.shop_name,
  );
  TestValidator.equals("snapshot price", orderItemDetail.snapshot.price, 29999);
  // 17. Validate variant options in snapshot
  TestValidator.predicate(
    "snapshot has variant options",
    orderItemDetail.snapshot.variantOptions.length > 0,
  );
  const colorOption = orderItemDetail.snapshot.variantOptions.find(
    (opt) => opt.optionKey === "color",
  );
  const sizeOption = orderItemDetail.snapshot.variantOptions.find(
    (opt) => opt.optionKey === "size",
  );
  TestValidator.equals(
    "snapshot color option value",
    colorOption?.optionValue,
    "Red",
  );
  TestValidator.equals(
    "snapshot size option value",
    sizeOption?.optionValue,
    "Large",
  );
}
