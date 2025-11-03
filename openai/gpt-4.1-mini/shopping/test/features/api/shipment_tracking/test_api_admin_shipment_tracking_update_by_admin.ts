import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

/**
 * Validate updating shipment tracking by an admin user.
 *
 * This test performs the following steps:
 *
 * 1. Admin joins and logs in to obtain authentication.
 * 2. Seller joins and logs in to create product.
 * 3. Customer joins and logs in to place an order.
 * 4. Admin creates shipment tracking linked to the order.
 * 5. Admin updates the shipment tracking record's details.
 * 6. Validates that all updated fields are correctly reflected.
 * 7. Tests the unauthorized access attempt by non-admin user.
 */
export async function test_api_admin_shipment_tracking_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "admin-password",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin login (redundant because join sets token, but per scenario)
  const adminLoginBody = {
    email: adminEmail,
    password: "admin-password",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Seller join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "seller-password",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "seller-password",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. Customer join and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "customer-password",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: "customer-password",
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 5. Seller creates product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Customer places order with items referencing product SKU
  // Since SKU creation or fetching is not provided, simulate by using product id as SKU id for order creation
  if (
    product.shopping_mall_product_skus === undefined ||
    product.shopping_mall_product_skus.length === 0
  ) {
    throw new Error("Product has no SKUs for order item");
  }
  const sku = product.shopping_mall_product_skus[0];

  const orderCreateBody = {
    order_code: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    shipping_address: "123 Main St, Seoul, South Korea",
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: sku.id,
        quantity: 1,
        unit_price: sku.price,
        total_price: sku.price,
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Admin creates shipment tracking for the order
  const shipmentTrackingCreateBody = {
    shopping_mall_order_id: order.id,
    tracking_number: "TRACK123456789",
    carrier_name: "FedEx",
    shipping_status: "shipped",
    shipped_at: new Date().toISOString(),
    delivered_at: null,
  } satisfies IShoppingMallShipmentTracking.ICreate;
  const shipmentTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.admin.shipmentTrackings.create(
      connection,
      { body: shipmentTrackingCreateBody },
    );
  typia.assert(shipmentTracking);

  // 8. Admin updates the shipment tracking
  // update with new tracking information
  const updatedTrackingNumber = "TRACK987654321";
  const updatedCarrierName = "DHL";
  const updatedShippingStatus = "in_transit";
  const updatedShippedAt = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const updatedDeliveredAt = new Date(Date.now() + 3600000).toISOString(); // an hour later

  const shipmentTrackingUpdateBody = {
    tracking_number: updatedTrackingNumber,
    carrier_name: updatedCarrierName,
    shipping_status: updatedShippingStatus,
    shipped_at: updatedShippedAt,
    delivered_at: updatedDeliveredAt,
  } satisfies IShoppingMallShipmentTracking.IUpdate;

  const updatedShipmentTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.admin.shipmentTrackings.updateShipmentTracking(
      connection,
      {
        id: shipmentTracking.id,
        body: shipmentTrackingUpdateBody,
      },
    );
  typia.assert(updatedShipmentTracking);

  // Validate updated fields
  TestValidator.equals(
    "Updated tracking number",
    updatedShipmentTracking.tracking_number,
    updatedTrackingNumber,
  );
  TestValidator.equals(
    "Updated carrier name",
    updatedShipmentTracking.carrier_name,
    updatedCarrierName,
  );
  TestValidator.equals(
    "Updated shipping status",
    updatedShipmentTracking.shipping_status,
    updatedShippingStatus,
  );
  TestValidator.equals(
    "Updated shipped at",
    updatedShipmentTracking.shipped_at,
    updatedShippedAt,
  );
  TestValidator.equals(
    "Updated delivered at",
    updatedShipmentTracking.delivered_at,
    updatedDeliveredAt,
  );

  // 9. Verify unauthorized update attempt by customer
  // Switch context to customer to test forbidden update
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  await TestValidator.error(
    "Non-admin user cannot update shipment tracking",
    async () => {
      await api.functional.shoppingMall.admin.shipmentTrackings.updateShipmentTracking(
        connection,
        {
          id: shipmentTracking.id,
          body: shipmentTrackingUpdateBody,
        },
      );
    },
  );
}
