import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_order_item_view_by_customer_before_shipment(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Join as customer
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create a shipping address for the customer
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Join as seller
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 4. Seller creates a product (no category needed)
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    { body: { category_id: null } },
  );
  typia.assert(product);
  // 5. Add a variant with options
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          options: [
            { key: "color", value: "Black" },
            { key: "size", value: "M" },
          ] satisfies IECommerceMallProductVariant.IOption[] & tags.MinItems<1>,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Restock inventory
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_change: 100,
          reason: "restock for test",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Add variant to customer cart
  const quantity = 2;
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: quantity,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Place order using the created address
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 9. Get the first order item from the order
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 10. Retrieve full order item detail
  const itemDetail =
    await api.functional.eCommerceMall.customer.orders.items.at(
      customerConnection,
      {
        orderCode: order.code,
        itemId: orderItem.id,
      },
    );
  typia.assert(itemDetail);
  // 11. Validate all expected fields
  // Order code matches
  TestValidator.equals("order code matches", itemDetail.order.code, order.code);
  // productVariantSnapshot: all fields present
  TestValidator.predicate(
    "productName exists",
    !!itemDetail.productVariantSnapshot.productName,
  );
  TestValidator.predicate(
    "productDescription exists",
    !!itemDetail.productVariantSnapshot.productDescription,
  );
  TestValidator.predicate(
    "productBasePrice is positive",
    itemDetail.productVariantSnapshot.productBasePrice > 0,
  );
  TestValidator.predicate(
    "variantSku exists",
    !!itemDetail.productVariantSnapshot.variantSku,
  );
  TestValidator.predicate(
    "variantOptions exists",
    !!itemDetail.productVariantSnapshot.variantOptions,
  );
  // sellerSnapshot fields present
  TestValidator.predicate(
    "shop_name exists",
    !!itemDetail.sellerSnapshot.shop_name,
  );
  // Status is 'paid'
  TestValidator.equals("status is paid", itemDetail.status, "paid");
  // statusLogs: exactly one entry, from_status=null, to_status='paid'
  TestValidator.equals("statusLogs count", itemDetail.statusLogs.length, 1);
  TestValidator.equals(
    "from_status is null",
    itemDetail.statusLogs[0].from_status,
    null,
  );
  TestValidator.equals(
    "to_status is paid",
    itemDetail.statusLogs[0].to_status,
    "paid",
  );
  // shipment is null (not yet shipped)
  TestValidator.equals("shipment is null", itemDetail.shipment, null);
  // cancellationRequest is null
  TestValidator.equals(
    "cancellationRequest is null",
    itemDetail.cancellationRequest,
    null,
  );
  // refundRequest is null
  TestValidator.equals("refundRequest is null", itemDetail.refundRequest, null);
  // review is null
  TestValidator.equals("review is null", itemDetail.review, null);
  // quantity matches cart quantity
  TestValidator.equals("quantity matches", itemDetail.quantity, quantity);
  // unit_price matches the order item's unit price
  TestValidator.equals(
    "unit_price matches",
    itemDetail.unit_price,
    orderItem.unit_price,
  );
}
