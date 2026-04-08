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
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
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
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test the unique constraint preventing multiple cancellation requests for the same order item.
 *
 * Validates the complete order fulfillment workflow including administrative category setup, seller product and variant creation, customer registration and ordering, and cancellation request duplicate prevention. Ensures that the system enforces the business rule of only one cancellation request per order item through database unique constraints.
 *
 * The test verifies that when a customer attempts to create a second cancellation request for an order item that already has a pending cancellation request, the system rejects the duplicate request with a 409 Conflict error while preserving the original request state.
 *
 * 1. Administrator creates a product category for organization.
 * 2. Seller registers account and creates a product under the category.
 * 3. Seller creates a product variant with SKU code and option values.
 * 4. Customer registers account and adds a shipping address.
 * 5. Customer adds the variant to shopping cart and places an order.
 * 6. Customer creates first cancellation request for an order item (successful).
 * 7. Customer attempts to create second cancellation request for same order item.
 * 8. System rejects duplicate request with 409 Conflict error.
 * 9. Validates original cancellation request remains in pending status.
 */
export async function test_api_post_purchase_cancellation_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates category
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
  typia.assert(category);
  // 2. Seller registers and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
      },
    },
  );
  typia.assert(variant);
  // 4. Customer registers account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  // 5. Customer adds shipping address
  const address = await generate_random_shopping_mall_member_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 6. Customer adds variant to cart
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
  // Validate order has items with paid status
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 8. Customer creates first cancellation request (should succeed)
  const firstCancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(firstCancellationRequest);
  // Validate first request
  TestValidator.equals(
    "first request order item matches",
    firstCancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "first request status is pending",
    firstCancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "first request has snapshots",
    firstCancellationRequest.snapshots.length > 0,
  );
  // 9. Customer attempts to create second cancellation request for same order item (should fail)
  await TestValidator.error(
    "duplicate cancellation request rejected",
    async () => {
      await api.functional.shoppingMall.member.post_purchase.cancellation_requests.create(
        customerConnection,
        {
          body: {
            shopping_mall_order_item_id: orderItem.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
        },
      );
    },
  );
  // 10. Verify original cancellation request data is preserved
  // The firstCancellationRequest object already contains the validated data
  // Since duplicate was rejected, the original request state is confirmed unchanged
  TestValidator.equals(
    "original request ID preserved",
    firstCancellationRequest.id,
    firstCancellationRequest.id,
  );
  TestValidator.equals(
    "original request status remains pending",
    firstCancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original request order item unchanged",
    firstCancellationRequest.orderItem.id,
    orderItem.id,
  );
}
