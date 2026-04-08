import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_member_admin_promotion_requests_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test post-purchase cancellation request snapshot audit trail retrieval by administrator.
 *
 * Validates the complete snapshot audit trail maintenance throughout the cancellation request lifecycle. Post-purchase cancellation requests maintain an immutable audit trail through snapshots that capture the request state at each significant event, enabling administrators to review complete history for dispute resolution and compliance verification.
 *
 * The test establishes a complete e-commerce workflow: super admin and member account creation, admin promotion approval, seller registration and approval, product catalog setup, order placement, shipment creation, and finally post-purchase cancellation request submission. The administrator then retrieves the cancellation request to verify the snapshot audit trail integrity.
 *
 * 1. Super admin account created via join endpoint.
 * 2. Member account created via join endpoint (becomes customer).
 * 3. Seller account created via join endpoint.
 * 4. Member submits admin promotion request.
 * 5. Super admin approves promotion request.
 * 6. Admin account created via join after approval.
 * 7. Seller submits seller approval request.
 * 8. Admin approves seller registration.
 * 9. Admin creates product category.
 * 10. Seller creates product.
 * 11. Seller creates product variant.
 * 12. Member adds variant to cart.
 * 13. Member places order from cart.
 * 14. Seller creates shipment marking items as shipped.
 * 15. Member creates post-purchase cancellation request.
 * 16. Admin retrieves cancellation request and validates snapshot audit trail.
 */
export async function test_api_post_purchase_cancellation_request_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create member account (will become customer)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 4. Member submits admin promotion request
  const promotionRequest =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      memberConnection,
      {
        body: {
          reason: "Requesting administrator privileges for platform management",
        },
      },
    );
  typia.assert(promotionRequest);
  // 5. Super admin approves promotion request
  const approvedPromotionRequest =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedPromotionRequest);
  TestValidator.equals(
    "promotion approved",
    approvedPromotionRequest.status,
    "approved",
  );
  // 6. Create admin account after approval
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(admin);
  // 7. Seller submits seller approval request
  const sellerApprovalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(sellerApprovalRequest);
  // 8. Admin approves seller registration
  const approvedSellerRequest =
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminConnection,
      {
        requestId: sellerApprovalRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedSellerRequest);
  TestValidator.equals(
    "seller approved",
    approvedSellerRequest.status,
    "approved",
  );
  // 9. Admin creates product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 10. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 11. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 12. Member adds variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // 13. Member places order
  // Note: This requires a customer address - using random UUID as placeholder
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 14. Seller creates shipment
  const orderItem = order.orderItems[0];
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
  // 15. Member creates post-purchase cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason:
            "Product received but not as described - requesting cancellation",
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation status pending",
    cancellationRequest.status,
    "pending",
  );
  // 16. Admin retrieves cancellation request and validates snapshot audit trail
  const retrievedRequest =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.at(
      adminConnection,
      {
        id: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate main response structure
  TestValidator.equals(
    "cancellation request id matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals("member matches", retrievedRequest.member.id, member.id);
  TestValidator.equals(
    "order item matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals("seller matches", retrievedRequest.seller.id, seller.id);
  TestValidator.equals(
    "reason preserved",
    retrievedRequest.reason,
    "Product received but not as described - requesting cancellation",
  );
  // Validate snapshot audit trail
  TestValidator.predicate(
    "snapshots array exists and non-empty",
    Array.isArray(retrievedRequest.snapshots) &&
      retrievedRequest.snapshots.length > 0,
  );
  // Validate initial snapshot (created when customer submitted request)
  const initialSnapshot = retrievedRequest.snapshots[0];
  typia.assert(initialSnapshot);
  TestValidator.equals(
    "initial snapshot status pending",
    initialSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "initial snapshot reason matches",
    initialSnapshot.reason,
    "Product received but not as described - requesting cancellation",
  );
  TestValidator.equals(
    "initial snapshot seller_response null",
    initialSnapshot.seller_response,
    null,
  );
  TestValidator.equals(
    "initial snapshot seller null",
    initialSnapshot.seller,
    null,
  );
  TestValidator.predicate(
    "initial snapshot has valid id",
    typeof initialSnapshot.id === "string" && initialSnapshot.id.length === 36,
  );
  TestValidator.predicate(
    "initial snapshot has valid created_at",
    typeof initialSnapshot.created_at === "string" &&
      initialSnapshot.created_at.includes("T"),
  );
  TestValidator.equals(
    "snapshot cancellationRequest id matches",
    initialSnapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  // Validate timestamps are in chronological order
  if (retrievedRequest.snapshots.length > 1) {
    for (let i = 1; i < retrievedRequest.snapshots.length; i++) {
      const prevSnapshot = retrievedRequest.snapshots[i - 1];
      const currSnapshot = retrievedRequest.snapshots[i];
      TestValidator.predicate(
        `snapshot ${i} timestamp after snapshot ${i - 1}`,
        new Date(currSnapshot.created_at).getTime() >=
          new Date(prevSnapshot.created_at).getTime(),
      );
    }
  }
  // Validate all snapshots preserve the original reason
  for (const snapshot of retrievedRequest.snapshots) {
    TestValidator.equals(
      `snapshot reason preserved for ${snapshot.id}`,
      snapshot.reason,
      "Product received but not as described - requesting cancellation",
    );
    typia.assert(snapshot);
  }
}
