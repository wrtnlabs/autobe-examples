import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test administrator retrieval of a specific refund request by unique identifier.
 *
 * Validates the complete refund request retrieval workflow including multi-actor setup (admin, customer, seller), order fulfillment, and administrative oversight access. Ensures that administrators can access any refund request on the platform regardless of ownership, with complete nested information about the customer and order item.
 *
 * The test establishes a realistic e-commerce scenario: a customer purchases a product from a seller, receives the shipment, and requests a refund. The administrator then retrieves the refund request to verify oversight capabilities and data completeness.
 *
 * 1. Administrator account created and authenticated.
 * 2. Customer account created with profile (display_name, phone_number).
 * 3. Seller account created and approved by administrator.
 * 4. Seller creates product with category and base price.
 * 5. Seller creates product variant with SKU code and option values.
 * 6. Customer places order containing the product variant.
 * 7. Seller creates shipment with tracking information.
 * 8. Shipment marked as delivered (simulated by setting delivered_at).
 * 9. Customer creates refund request for delivered order item with status 'pending'.
 * 10. Administrator retrieves refund request by ID and validates all fields.
 */
export async function test_api_refund_request_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Customer setup - create member account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller setup - create and approve seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Admin approves seller registration
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {
        approval_status: "approved",
        rejection_reason: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          shopping_mall_product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 6. Customer places order
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Find the order item for this product
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 7. Seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "USPS",
          ] as const),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 8. Mark shipment as delivered (simulate delivery confirmation)
  // Note: In real scenario, customer would confirm delivery or auto-delivery after 14 days
  // For test purposes, we assume the order item status is now 'delivered'
  // 9. Customer creates refund request
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 10. Admin retrieves refund request by ID
  const retrievedRefundRequest =
    await api.functional.shoppingMall.admin.refund_requests.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // Validate refund request structure and data integrity
  TestValidator.equals(
    "refund request ID matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request status is pending",
    retrievedRefundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reviewed_at is null for pending status",
    retrievedRefundRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    retrievedRefundRequest.deleted_at,
    null,
  );
  TestValidator.equals(
    "reason matches submitted reason",
    retrievedRefundRequest.reason,
    refundRequest.reason,
  );
  // Validate member (customer) information
  TestValidator.equals(
    "member ID matches customer",
    retrievedRefundRequest.member.id,
    customerAuth.id,
  );
  // Validate order item information
  TestValidator.equals(
    "orderItem ID matches",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "orderItem status is delivered",
    retrievedRefundRequest.orderItem.status,
    "delivered",
  );
  TestValidator.equals(
    "orderItem quantity matches",
    retrievedRefundRequest.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "orderItem price matches",
    retrievedRefundRequest.orderItem.price,
    orderItem.price,
  );
  TestValidator.equals(
    "orderItem has orderCode",
    retrievedRefundRequest.orderItem.orderCode,
    order.code,
  );
  // Validate product information in order item
  TestValidator.equals(
    "product ID matches",
    retrievedRefundRequest.orderItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedRefundRequest.orderItem.product.name,
    product.name,
  );
  // Validate seller information in order item
  TestValidator.equals(
    "seller ID matches",
    retrievedRefundRequest.orderItem.seller.id,
    sellerAuth.id,
  );
  // Validate shipment information in order item
  TestValidator.predicate(
    "orderItem has shipment",
    retrievedRefundRequest.orderItem.shipment !== null,
  );
  if (retrievedRefundRequest.orderItem.shipment) {
    TestValidator.equals(
      "shipment ID matches",
      retrievedRefundRequest.orderItem.shipment.id,
      shipment.id,
    );
    TestValidator.equals(
      "shipment carrier_name matches",
      retrievedRefundRequest.orderItem.shipment.carrier_name,
      shipment.carrier_name,
    );
    TestValidator.equals(
      "shipment tracking_number matches",
      retrievedRefundRequest.orderItem.shipment.tracking_number,
      shipment.tracking_number,
    );
  }
}