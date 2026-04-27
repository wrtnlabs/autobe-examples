import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
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
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_administrator_shipment_view_shipped(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup actor connections ----
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Administrator joins
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(adminAuthorized);
  // 2. Seller joins (approval_status = 'pending')
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // 3. Seller submits approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 4. Administrator approves the seller
  const approvedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 6. Seller creates a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 7. Seller restocks the variant
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<100>
          >(),
          reason: "test restock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 8. Customer joins
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  // 9. Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 10. Customer adds variant to cart
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { product_variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // 11. Customer places the order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: { addressId: address.id },
    },
  );
  typia.assert(order);
  const carrierName = RandomGenerator.alphabets(8);
  const trackingNumber = "TRK-" + RandomGenerator.alphaNumeric(10);
  // 12. Seller creates a shipment with the paid order item
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [order.orderItems[0].id],
          carrierName: carrierName,
          trackingNumber: trackingNumber,
        },
      },
    );
  typia.assert(shipment);
  // 13. Administrator retrieves the shipment by ID
  const readShipment =
    await api.functional.eCommerceMall.administrator.shipments.at(
      adminConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(readShipment);
  // ---- Validations ----
  TestValidator.equals("shipment ID matches", readShipment.id, shipment.id);
  TestValidator.equals(
    "carrier name matches",
    readShipment.carrier_name,
    carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    readShipment.tracking_number,
    trackingNumber,
  );
  TestValidator.predicate(
    "shipped_at is set",
    () => readShipment.shipped_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is null",
    () => readShipment.delivered_at === null,
  );
  TestValidator.equals(
    "seller email matches",
    readShipment.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "seller approval status",
    readShipment.seller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "has 1 shipment item",
    readShipment.shipmentItems.length,
    1,
  );
  const shipmentItem = readShipment.shipmentItems[0];
  const originalOrderItem = order.orderItems[0];
  TestValidator.equals(
    "order item ID matches",
    shipmentItem.orderItem.id,
    originalOrderItem.id,
  );
  TestValidator.equals(
    "order item status is shipped",
    shipmentItem.orderItem.status,
    "shipped",
  );
  TestValidator.equals(
    "order item quantity",
    shipmentItem.orderItem.quantity,
    originalOrderItem.quantity,
  );
  TestValidator.predicate(
    "order item unit price is positive",
    () => shipmentItem.orderItem.unit_price > 0,
  );
  TestValidator.predicate(
    "order item subtotal is correct",
    () =>
      Math.abs(
        shipmentItem.orderItem.subtotal -
          shipmentItem.orderItem.unit_price * shipmentItem.orderItem.quantity,
      ) < 0.001,
  );
  TestValidator.equals(
    "snapshot product name matches",
    shipmentItem.snapshot.productName,
    originalOrderItem.productVariantSnapshot.productName,
  );
  TestValidator.equals(
    "snapshot variant SKU matches",
    shipmentItem.snapshot.variantSku,
    originalOrderItem.productVariantSnapshot.variantSku,
  );
  TestValidator.equals(
    "seller snapshot shop name matches",
    shipmentItem.sellerSnapshot.shop_name,
    originalOrderItem.sellerSnapshot.shop_name,
  );
}
