import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_item_retrieval_single_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerJoin);
  // Create customer login connection with token
  const customerConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: customerJoinInput.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // 2. Seller setup - join
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerJoin);
  // Create seller login connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerJoinInput.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 3. Customer creates shopping cart
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 4. Generate product data from seller
  // Since we need to add a product from the seller, we generate seller's product ID
  const sellerProductId = typia.random<string & tags.Format<"uuid">>();
  const sellerProductVariantId = typia.random<string & tags.Format<"uuid">>();
  const sellerProductVariantData =
    typia.random<IEcommerceMallProductVariant.ISummary>();
  // Customer adds product from seller to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: sellerProductVariantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Customer creates order from cart
  const orderRequest = {
    search: undefined,
    overallStatus: undefined,
    createdAtMin: undefined,
    createdAtMax: undefined,
    totalPriceMin: undefined,
    totalPriceMax: undefined,
    sortBy: "createdAt",
    sortOrder: "DESC",
    cursor: undefined,
    limit: 1,
    page: undefined,
  } satisfies IEcommerceMallOrder.IRequest;
  const orderPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    { body: orderRequest },
  );
  typia.assert(orderPage);
  // Find the most recent order
  const order = orderPage.data[orderPage.data.length - 1];
  typia.assert(order);
  // 6. Seller creates shipment for order items
  // For single-seller scenario, we mock the order items from this seller
  const orderItemMock = {
    id: typia.random<string & tags.Format<"uuid">>(),
    item_status: "paid",
    quantity: cartItem.quantity,
    unit_price: cartItem.price,
    product_snapshot: {
      id: sellerProductId,
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph(),
      category: RandomGenerator.alphabets(5),
      basePrice: String(cartItem.price),
    },
    variant_snapshot: {
      id: sellerProductVariantId,
      skuCode: RandomGenerator.alphabets(10),
      optionValues: "{}",
      priceOverride: "",
    },
    seller_profile_snapshot: {
      id: sellerLogin.id,
      shopName: RandomGenerator.name(),
      logo: RandomGenerator.alphabets(10),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEcommerceMallOrderItem.ISummary;
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          carrier_name: RandomGenerator.alphabets(5),
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
          order_items: [
            {
              variant_id: sellerProductVariantId,
              quantity: cartItem.quantity,
              unit_price: cartItem.price,
              product_id: sellerProductId,
              product_snapshot: JSON.stringify(orderItemMock.product_snapshot),
              variant_snapshot: JSON.stringify(orderItemMock.variant_snapshot),
              seller_profile_snapshot: JSON.stringify(
                orderItemMock.seller_profile_snapshot,
              ),
            },
          ] satisfies IEcommerceMallOrderItem.ICreate[],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 7. Seller retrieves shipment item details
  // Since shipment.order_items contains the order item references,
  // we need to get the shipment item ID from the response
  const shipmentItemId =
    shipment.id ??
    typia.random<string & tags.Format<"uuid">>();
  const shipmentItem =
    await api.functional.ecommerceMall.customer.orders.shipments.items.at(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        shipmentItemId: shipmentItemId,
      },
    );
  typia.assert(shipmentItem);
  // 8. Validate shipment tracking information is accessible
  TestValidator.equals(
    "shipment carrier name matches",
    shipmentItem.shipment.carrierName,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "shipment tracking number matches",
    shipmentItem.shipment.trackingNumber,
    shipment.tracking_number,
  );
  // 9. Validate shipment item is properly linked to order item
  TestValidator.equals(
    "shipment item order item status is shipped",
    shipmentItem.order_item.item_status,
    "shipped",
  );
  // 10. Validate tracking information is consistent
  TestValidator.equals(
    "shipment item order ID matches",
    shipmentItem.shipment.order.id,
    order.id,
  );
  // 11. Validate shipment contains only items from this seller
  TestValidator.equals(
    "shipment seller ID matches",
    shipmentItem.shipment.seller.id,
    sellerLogin.id,
  );
  // 12. Validate shipment was created by the correct seller
  TestValidator.equals(
    "shipment created by correct seller",
    shipment.seller.id,
    sellerLogin.id,
  );
}