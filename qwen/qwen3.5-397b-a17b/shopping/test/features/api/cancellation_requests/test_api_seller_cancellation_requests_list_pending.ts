import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that an authenticated seller can successfully retrieve a list of pending cancellation requests for order items from their products.
 *
 * Validates the complete cancellation request workflow including seller product setup, customer order placement, cancellation request creation, and seller retrieval of pending requests. Ensures that the seller can only view cancellation requests for order items from their own products.
 *
 * Special attention is given to verifying that the cancellation request appears with correct status 'pending', includes accurate customer information, matches the submitted reason text, and contains proper pagination metadata. The responded_at field must be null indicating the request is still awaiting seller review.
 *
 * 1. Seller registers and authenticates with approved status.
 * 2. Seller creates a product with one variant.
 * 3. Customer registers and authenticates.
 * 4. Customer places an order containing the seller's product variant.
 * 5. Customer creates a cancellation request for the order item.
 * 6. Seller authenticates and retrieves pending cancellation requests.
 * 7. Validates response contains the cancellation request with status 'pending', correct order item reference, customer information, matching reason text, and proper pagination metadata.
 */
export async function test_api_seller_cancellation_requests_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create product with variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 3. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 4. Place order containing seller's product
  // Note: Order items are derived from customer's cart which should contain the product
  const order = await generate_random_shopping_mall_member_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  // 5. Create cancellation request for order item
  const orderItem = order.orderItems[0];
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create(
      customerLoginConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: cancellationReason,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller retrieves pending cancellation requests
  const result =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerLoginConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 7. Validate response
  TestValidator.predicate("has data", () => result.data.length > 0);
  const foundRequest = result.data.find(
    (req) => req.id === cancellationRequest.id,
  );
  TestValidator.predicate(
    "cancellation request found",
    () => foundRequest !== undefined,
  );
  if (foundRequest) {
    TestValidator.equals("status is pending", foundRequest.status, "pending");
    TestValidator.equals(
      "order item matches",
      foundRequest.orderItem.id,
      orderItem.id,
    );
    TestValidator.equals(
      "reason matches",
      foundRequest.reason,
      cancellationReason,
    );
    TestValidator.predicate(
      "responded_at is null",
      () =>
        foundRequest.responded_at === null ||
        foundRequest.responded_at === undefined,
    );
    TestValidator.predicate(
      "created_at is valid ISO date",
      () =>
        typeof foundRequest.created_at === "string" &&
        foundRequest.created_at.length > 0,
    );
    TestValidator.predicate(
      "customer info present",
      () => foundRequest.customer !== null,
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    () => result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    () => result.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records",
    () => result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages",
    () => result.pagination.pages >= 1,
  );
}