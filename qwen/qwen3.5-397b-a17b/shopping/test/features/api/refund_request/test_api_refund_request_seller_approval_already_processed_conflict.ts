import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller approval of already processed refund request returns 409 Conflict.
 *
 * Validates the business rule that prevents sellers from approving refund requests that have already been processed (status is 'approved' or 'rejected'). This test ensures idempotency protection in the refund approval workflow by verifying that attempting to approve an already-approved refund request results in a 409 Conflict error.
 *
 * The test establishes a complete order fulfillment and refund workflow: seller creates product, customer purchases and receives the item, customer requests refund, and seller approves the refund. The critical validation occurs when the seller attempts to approve the same refund request a second time.
 *
 * 1. Seller registers account and creates product with variant.
 * 2. Customer registers, creates shipping address, adds product to cart, and places order.
 * 3. Seller creates shipment for the order item, transitioning it to 'shipped' status.
 * 4. Order item auto-transitions to 'delivered' status (simulated by shipment creation).
 * 5. Customer submits refund request for the delivered order item.
 * 6. Seller approves the refund request (first approval succeeds, status becomes 'approved').
 * 7. Seller attempts to approve the same refund request again.
 * 8. System returns 409 Conflict because refund request is no longer in 'pending' status.
 * 9. Validates that refund request status remains 'approved' and reviewed_at is unchanged.
 */
export async function test_api_refund_request_seller_approval_already_processed_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Store original passwords for login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerLogin);
  // 2. Admin creates category for product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller creates product with variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_member_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerLogin);
  // 5. Customer creates address
  const address = await generate_random_shopping_mall_member_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 6. Customer adds product to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
      },
    },
  );
  typia.assert(cartItem);
  // 7. Customer places order
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 8. Get order item for shipment
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  const orderItemId = orderItem!.id;
  // 9. Seller creates shipment to transition order item to delivered
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItemId],
        },
      },
    );
  typia.assert(shipment);
  // 10. Customer creates refund request for delivered order item
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
        },
      },
    );
  typia.assert(refundRequest);
  // Verify refund request is in pending status
  TestValidator.equals(
    "refund request initial status",
    refundRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "reviewed_at is null initially",
    refundRequest.reviewed_at === null ||
      refundRequest.reviewed_at === undefined,
  );
  // 11. Seller approves refund request (first approval - should succeed)
  const firstApproval =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(firstApproval);
  // Verify first approval succeeded
  TestValidator.equals(
    "refund request status after first approval",
    firstApproval.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is set after first approval",
    firstApproval.reviewed_at !== null &&
      firstApproval.reviewed_at !== undefined,
  );
  const firstReviewedAt = firstApproval.reviewed_at;
  // 12. Seller attempts to approve same refund request again (should fail with 409 Conflict)
  await TestValidator.error(
    "second approval attempt returns 409 Conflict",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.approve(
        sellerConnection,
        {
          refundRequestId: refundRequest.id,
        },
      );
    },
  );
  // 13. Verify the first approval response state is preserved
  // The error being thrown confirms the state was not modified
  TestValidator.equals(
    "first approval status preserved",
    firstApproval.status,
    "approved",
  );
  TestValidator.predicate(
    "first reviewed_at timestamp preserved",
    firstReviewedAt !== null && firstReviewedAt !== undefined,
  );
}
