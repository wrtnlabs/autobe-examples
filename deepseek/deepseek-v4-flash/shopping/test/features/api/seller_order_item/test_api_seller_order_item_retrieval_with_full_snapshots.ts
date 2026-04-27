import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_order_item_retrieval_with_full_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const shopName = sellerAuth.profile!.shopName;
  // 2. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates a variant with a specific price
  const variantPrice = typia.random<
    number & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          price: variantPrice,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Seller adds initial inventory
  const initialStock = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
  >();
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      body: {
        quantity_change: initialStock,
        reason: "seller restock",
      },
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 5. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 6. Customer adds variant to cart
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity,
      },
    },
  );
  // 7. Customer places order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item ID
  const orderItemId = order.orderItems[0].id;
  // 8. Seller retrieves the order item
  const item = await api.functional.eCommerceMall.seller.order_items.at(
    sellerConnection,
    { itemId: orderItemId },
  );
  typia.assert(item);
  // 9. Validate all fields
  // (a) id matches requested itemId
  TestValidator.equals("item id", item.id, orderItemId);
  // (b) quantity matches
  TestValidator.equals("quantity", item.quantity, quantity);
  // (c) unit_price matches variant price (since we set a price override)
  TestValidator.equals("unit price", item.unit_price, variantPrice);
  // (d) status is 'paid'
  TestValidator.equals("status", item.status, "paid");
  // (e) order object validation
  TestValidator.equals("order code", item.order.code, order.code);
  TestValidator.equals("order total price",
    item.order.total_price,
    order.totalPrice,
  );
  TestValidator.equals("order customer id",
    item.order.customer.id,
    customerAuth.id,
  );
  TestValidator.equals("order customer email",
    item.order.customer.email,
    customerAuth.email,
  );
  TestValidator.equals("order customer display name",
    item.order.customer.profile!.display_name,
    customerAuth.profile.display_name,
  );
  TestValidator.equals("order created_at",
    item.order.created_at,
    order.createdAt,
  );
  TestValidator.predicate(
    "order status is not empty",
    item.order.status.length > 0,
  );
  // (f) productVariant object
  TestValidator.equals("variant sku_code",
    item.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals("variant options keys match",
    Object.keys(item.productVariant.options),
    variant.options.map((o) => o.key),
  );
  TestValidator.equals("variant options values match",
    Object.values(item.productVariant.options),
    variant.options.map((o) => o.value),
  );
  TestValidator.predicate(
    "variant stock is non-negative",
    item.productVariant.stock >= 0,
  );
  TestValidator.equals("variant effective_price",
    item.productVariant.effective_price,
    variantPrice,
  );
  TestValidator.equals("variant product id",
    item.productVariant.product.id,
    product.id,
  );
  // (g) productVariantSnapshot
  TestValidator.equals("snapshot product name",
    item.productVariantSnapshot.productName,
    product.name,
  );
  TestValidator.equals("snapshot product description",
    item.productVariantSnapshot.productDescription,
    product.description,
  );
  TestValidator.equals("snapshot product base price",
    item.productVariantSnapshot.productBasePrice,
    product.base_price,
  );
  TestValidator.equals("snapshot variant sku",
    item.productVariantSnapshot.variantSku,
    variant.sku_code,
  );
  TestValidator.equals("snapshot variant price",
    item.productVariantSnapshot.variantPrice,
    variantPrice,
  );
  // (h) sellerSnapshot
  TestValidator.equals("seller snapshot shop name",
    item.sellerSnapshot.shop_name,
    shopName,
  );
  // (i) statusLogs
  TestValidator.predicate("status logs not empty", item.statusLogs.length > 0);
  TestValidator.equals(
    "first status log from_status",
    item.statusLogs[0].from_status,
    null,
  );
  TestValidator.equals(
    "first status log to_status",
    item.statusLogs[0].to_status,
    "paid",
  );
  // (j) shipment is null
  TestValidator.equals("shipment is null", item.shipment, null);
  // (k) cancellationRequest is null
  TestValidator.equals(
    "cancellationRequest is null",
    item.cancellationRequest,
    null,
  );
  // (l) refundRequest is null
  TestValidator.equals("refundRequest is null", item.refundRequest, null);
  // (m) review is null
  TestValidator.equals("review is null", item.review, null);
}