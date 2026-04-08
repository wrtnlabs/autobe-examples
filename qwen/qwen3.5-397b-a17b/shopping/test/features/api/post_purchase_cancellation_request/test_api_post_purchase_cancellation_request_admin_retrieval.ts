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
 * Test administrator retrieval of post-purchase cancellation request by UUID.
 *
 * Validates the complete workflow from account setup through cancellation request creation and admin retrieval. Ensures that administrators can access full cancellation request details including customer information, order item data, seller details, and audit trail snapshots.
 *
 * The test establishes a realistic e-commerce scenario with multiple actors: super administrator for promotion approval, regular administrator for oversight, seller for product fulfillment, and member as customer. The cancellation request is created after order shipment to test the post-purchase cancellation workflow.
 *
 * 1. Super administrator account created for promotion approval workflow.
 * 2. Member account created to become customer and submit admin promotion request.
 * 3. Seller account created for product listing and order fulfillment.
 * 4. Member submits admin promotion request with reason text.
 * 5. Super administrator approves promotion request.
 * 6. Administrator account created through approved promotion workflow.
 * 7. Seller submits approval request for selling permissions.
 * 8. Administrator approves seller registration.
 * 9. Administrator creates product category for catalog organization.
 * 10. Seller creates product with name, description, category, and base price.
 * 11. Seller creates product variant with SKU code and option values.
 * 12. Member adds product variant to shopping cart.
 * 13. Member places order from cart items.
 * 14. Seller creates shipment with tracking information for order items.
 * 15. Member creates post-purchase cancellation request for order item.
 * 16. Administrator retrieves cancellation request by UUID and validates complete response structure.
 */
export async function test_api_post_purchase_cancellation_request_admin_retrieval(
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
          reason: RandomGenerator.paragraph({ sentences: 2 }),
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
  // 7. Seller submits approval request
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
  // 9. Admin creates product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
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
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
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
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // 13. Member places order
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
  // Get order items from the order
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 14. Seller creates shipment
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
          tracking_number: RandomGenerator.alphaNumeric(12).toUpperCase(),
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
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 16. Admin retrieves cancellation request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.at(
      adminConnection,
      {
        id: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate response structure
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedRequest.member.email,
    member.email,
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.predicate(
    "seller_response_reason is null for pending",
    retrievedRequest.seller_response_reason === null ||
      retrievedRequest.seller_response_reason === undefined,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(retrievedRequest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(Date.parse(retrievedRequest.updated_at)),
  );
  TestValidator.predicate(
    "snapshots array has at least one entry",
    retrievedRequest.snapshots.length >= 1,
  );
  // Validate snapshot structure
  const initialSnapshot = retrievedRequest.snapshots[0];
  typia.assert(initialSnapshot);
  TestValidator.equals(
    "snapshot status is pending",
    initialSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "snapshot reason matches",
    initialSnapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.predicate(
    "initial snapshot seller is null",
    initialSnapshot.seller === null,
  );
  TestValidator.predicate(
    "snapshot created_at is valid ISO date",
    !isNaN(Date.parse(initialSnapshot.created_at)),
  );
}
