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
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an administrator can successfully retrieve details of a pending refund request.
 *
 * Validates the complete refund request retrieval workflow including administrative setup, seller product creation, customer order placement, shipment creation, refund request submission, and admin retrieval. Ensures that the admin endpoint returns complete refund request details with all nested relations properly populated.
 *
 * Special attention is given to verifying that the refund request is accessible to admin for platform oversight regardless of ownership, and that all nested relations (member with customerProfile, orderItem with product/variant/seller/shipment) are correctly included in the response.
 *
 * 1. Administrator creates account and logs in.
 * 2. Seller creates account and logs in.
 * 3. Admin approves seller registration (approval_status: 'approved').
 * 4. Seller creates product with name, description, category, and base price.
 * 5. Seller creates product variant with SKU code and option values.
 * 6. Customer (member) creates account and logs in.
 * 7. Customer places order containing the product variant.
 * 8. Seller creates shipment with tracking information to mark order items as shipped.
 * 9. Customer creates refund request for the delivered order item with reason text.
 * 10. Admin retrieves the refund request by ID.
 * 11. Validates response structure: member with email and customerProfile (display_name, phone_number), orderItem with product/variant/seller/shipment references, reason text, status 'pending', reviewed_at null, and timestamps.
 */
export async function test_api_admin_refund_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup
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
  // 3. Admin approves seller registration
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
  TestValidator.equals(
    "seller approval status",
    updatedSeller.approval_status,
    "approved",
  );
  // 4. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: null,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Customer (member) setup
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
  // 7. Customer places order
  const order = await api.functional.shoppingMall.member.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // 8. Seller creates shipment to mark order as shipped/delivered
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 9. Customer creates refund request (status: pending)
  const refundRequest =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals("refund status", refundRequest.status, "pending");
  TestValidator.predicate(
    "reviewed_at is null",
    refundRequest.reviewed_at === null,
  );
  // 10. Admin retrieves the refund request by ID
  const retrievedRefundRequest =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.at(
      adminConnection,
      {
        id: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 11. Validate response structure
  TestValidator.equals(
    "refund request ID",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund status",
    retrievedRefundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reason matches",
    retrievedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "reviewed_at is null",
    retrievedRefundRequest.reviewed_at === null,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedRefundRequest.deleted_at === null,
  );
  // Validate member information with email and customer profile
  TestValidator.equals(
    "member ID",
    retrievedRefundRequest.member.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "member email",
    retrievedRefundRequest.member.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "member has customerProfile",
    retrievedRefundRequest.member.customerProfile !== null,
  );
  if (retrievedRefundRequest.member.customerProfile) {
    TestValidator.predicate(
      "customerProfile has display_name",
      retrievedRefundRequest.member.customerProfile.display_name.length > 0,
    );
    TestValidator.predicate(
      "customerProfile has phone_number",
      retrievedRefundRequest.member.customerProfile.phone_number.length > 0,
    );
  }
  // Validate order item details with product/variant/seller/shipment references
  TestValidator.equals(
    "order item ID",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order item quantity",
    retrievedRefundRequest.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "order item price",
    retrievedRefundRequest.orderItem.price,
    orderItem.price,
  );
  TestValidator.equals(
    "order item status",
    retrievedRefundRequest.orderItem.status,
    "shipped",
  );
  // Validate product reference
  TestValidator.equals(
    "product ID",
    retrievedRefundRequest.orderItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name",
    retrievedRefundRequest.orderItem.product.name,
    product.name,
  );
  // Validate variant reference
  TestValidator.equals(
    "variant ID",
    retrievedRefundRequest.orderItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant SKU",
    retrievedRefundRequest.orderItem.productVariant.sku_code,
    variant.sku_code,
  );
  // Validate seller reference
  TestValidator.equals(
    "seller ID",
    retrievedRefundRequest.orderItem.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email",
    retrievedRefundRequest.orderItem.seller.email,
    sellerAuth.email,
  );
  // Validate shipment reference
  TestValidator.predicate(
    "shipment exists",
    retrievedRefundRequest.orderItem.shipment !== null,
  );
  if (retrievedRefundRequest.orderItem.shipment) {
    TestValidator.equals(
      "shipment ID",
      retrievedRefundRequest.orderItem.shipment.id,
      shipment.id,
    );
    TestValidator.equals(
      "shipment tracking",
      retrievedRefundRequest.orderItem.shipment.tracking_number,
      shipment.tracking_number,
    );
  }
  // Validate timestamps
  TestValidator.predicate(
    "created_at exists",
    retrievedRefundRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRefundRequest.updated_at.length > 0,
  );
}
