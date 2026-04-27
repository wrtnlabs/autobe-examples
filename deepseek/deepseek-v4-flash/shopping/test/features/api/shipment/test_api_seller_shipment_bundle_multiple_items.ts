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

export async function test_api_seller_shipment_bundle_multiple_items(
  connection: api.IConnection,
): Promise<void> {
  // ---- SETUP ----
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(seller);
  // 2. Seller submits an approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request status",
    approvalRequest.status,
    "pending",
  );
  // 3. Register an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin);
  // 4. Administrator approves the seller
  const reviewed =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved" as const,
        },
      },
    );
  typia.assert(reviewed);
  TestValidator.equals(
    "approval request approved",
    reviewed.status,
    "approved",
  );
  // 5. Seller re-authenticates (after approval, token reflects 'approved' status)
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerRelogged = await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerRelogged);
  TestValidator.equals(
    "seller status approved after login",
    sellerRelogged.approval_status,
    "approved",
  );
  // 6. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection2,
    {},
  );
  typia.assert(product);
  TestValidator.equals(
    "product has seller id",
    product.seller.id,
    sellerRelogged.id,
  );
  // 7. Seller creates two variants with different options
  const variant1 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection2,
      {
        body: {
          options: [
            { key: "size", value: "Small" },
            { key: "color", value: "Red" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection2,
      {
        body: {
          options: [
            { key: "size", value: "Large" },
            { key: "color", value: "Blue" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  TestValidator.notEquals("different variant ids", variant1.id, variant2.id);
  // 8. Seller restocks both variants
  const restock1 =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection2,
      {
        body: {
          quantity_change: 100,
          reason: "initial restock",
        },
        params: {
          productId: product.id,
          variantId: variant1.id,
        },
      },
    );
  typia.assert(restock1);
  const restock2 =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection2,
      {
        body: {
          quantity_change: 100,
          reason: "initial restock",
        },
        params: {
          productId: product.id,
          variantId: variant2.id,
        },
      },
    );
  typia.assert(restock2);
  // Verify stock is positive
  TestValidator.predicate("variant1 in stock", variant1.stock > 0);
  TestValidator.predicate("variant2 in stock", variant2.stock > 0);
  // 9. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 10. Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 11. Customer adds both variants to cart
  const cartItem1 =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant1.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // 12. Customer places an order
  const order = await api.functional.eCommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify the order has two items (one per variant)
  TestValidator.equals("order items count", order.orderItems.length, 2);
  for (const oi of order.orderItems) {
    TestValidator.equals("order item status paid", oi.status, "paid");
  }
  const orderItemIds = order.orderItems.map((oi) => oi.id);
  // 13. Seller creates a shipment bundling both order items
  const shipment = await api.functional.eCommerceMall.seller.shipments.create(
    sellerConnection2,
    {
      body: {
        carrierName: "Test Carrier",
        trackingNumber: "TRACK123456",
        orderItemIds: orderItemIds,
      } satisfies IECommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // ---- VALIDATIONS ----
  TestValidator.equals(
    "carrier_name matches",
    shipment.carrier_name,
    "Test Carrier",
  );
  TestValidator.equals(
    "tracking_number matches",
    shipment.tracking_number,
    "TRACK123456",
  );
  TestValidator.predicate(
    "shipped_at is set",
    () => shipment.shipped_at !== null,
  );
  TestValidator.equals(
    "shipment items count",
    shipment.shipmentItems.length,
    2,
  );
  TestValidator.equals(
    "seller id matches",
    shipment.seller.id,
    sellerRelogged.id,
  );
  // Validate each bundled order item status changed to 'shipped'
  for (const si of shipment.shipmentItems) {
    TestValidator.equals(
      `order item ${si.orderItem.id} status shipped`,
      si.orderItem.status,
      "shipped",
    );
  }
}
