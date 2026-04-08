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
import { generate_random_shopping_mall_member_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller cancellation request approval success workflow.
 *
 * Validates the complete cancellation request approval flow from a seller's perspective. The test establishes the full prerequisite chain including admin category creation, seller registration and product setup, customer registration and ordering, and cancellation request creation. The seller then approves the cancellation request, and the test validates that all state changes occur correctly.
 *
 * The test verifies that the cancellation request status transitions from 'pending' to 'approved', the order item status changes to 'cancelled', and the responded_at timestamp is populated. This ensures the seller approval workflow functions correctly and maintains data integrity across related entities.
 *
 * 1. Administrator creates a product category for product organization.
 * 2. Seller registers account and logs in with approved status.
 * 3. Seller creates a product in the category with base pricing.
 * 4. Seller creates a product variant with SKU code and option values.
 * 5. Customer (member) registers account and logs in.
 * 6. Customer creates a shipping address for order delivery.
 * 7. Customer adds the product variant to shopping cart.
 * 8. Customer places an order creating order items with 'paid' status.
 * 9. Customer creates a cancellation request for the order item with 'pending' status.
 * 10. Seller approves the cancellation request via the approval endpoint.
 * 11. Validates cancellation request status is 'approved' and responded_at is set.
 * 12. Validates order item status changed to 'cancelled'.
 */
export async function test_api_seller_cancellation_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 2. Seller registers and logs in
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
        },
      },
    );
  // 5. Customer (member) registers and logs in
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoin = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberJoin.email,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 6. Customer creates shipping address
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {},
  );
  // 7. Customer adds variant to cart
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
  // 8. Customer places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  // Get the first order item for cancellation
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 9. Customer creates cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation request order item matches",
    cancellationRequest.orderItem.id,
    orderItem.id,
  );
  // 10. Seller approves cancellation request
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 11. Validate cancellation request status changed to approved
  TestValidator.equals(
    "cancellation request status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is populated",
    approvedRequest.respondedAt !== null,
  );
  // 12. Validate order item status changed to cancelled
  TestValidator.equals(
    "order item status is cancelled",
    approvedRequest.orderItem.status,
    "cancelled",
  );
}
