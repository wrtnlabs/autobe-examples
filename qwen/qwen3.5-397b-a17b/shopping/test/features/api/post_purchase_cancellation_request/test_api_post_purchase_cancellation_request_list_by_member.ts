import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test member retrieval of post-purchase cancellation requests with pagination.
 *
 * Validates the complete workflow for a member to retrieve their post-purchase cancellation requests. This test ensures that the cancellation request list endpoint properly returns paginated results with all required fields including member, order item, and seller information.
 *
 * The test creates a realistic scenario where a member purchases a product from a seller, then requests cancellation for the order item. The member then queries their cancellation requests to verify the data is correctly returned with proper pagination metadata.
 *
 * 1. Member registers and authenticates via join.
 * 2. Seller registers and creates a product with variant.
 * 3. Member creates an order purchasing the product.
 * 4. Member creates a post-purchase cancellation request for the order item.
 * 5. Member retrieves their cancellation requests list.
 * 6. Validates pagination structure and cancellation request data completeness.
 * 7. Verifies data isolation by confirming only the member's requests are returned.
 */
export async function test_api_post_purchase_cancellation_request_list_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Seller registration
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
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
        },
      },
    );
  typia.assert(variant);
  // 5. Member creates order
  // Note: The generate function handles cart internally
  const customerAddressId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: customerAddressId,
      },
    },
  );
  typia.assert(order);
  // 6. Get the first order item for cancellation request
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", () => order.orderItems.length > 0);
  // 7. Member creates post-purchase cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 8. Member retrieves their cancellation requests list
  const response =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 9. Validate pagination structure
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has at least 1 record",
    () => response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated",
    () => response.pagination.pages >= 1,
  );
  // 10. Validate cancellation request data
  TestValidator.predicate(
    "data array has requests",
    () => response.data.length >= 1,
  );
  const foundRequest = response.data.find(
    (req) => req.id === cancellationRequest.id,
  );
  TestValidator.predicate(
    "created request found in list",
    () => foundRequest !== undefined,
  );
  if (foundRequest) {
    // Validate status is pending (newly created)
    TestValidator.equals("status is pending", foundRequest.status, "pending");
    // Validate member matches authenticated user
    TestValidator.equals(
      "member id matches",
      foundRequest.member.id,
      memberAuth.id,
    );
    // Validate order item references correct product
    TestValidator.equals(
      "order item product matches",
      foundRequest.orderItem.product.id,
      product.id,
    );
    // Validate seller information is present
    TestValidator.equals(
      "seller id matches",
      foundRequest.seller.id,
      sellerAuth.id,
    );
    // Validate reason matches
    TestValidator.equals(
      "reason matches",
      foundRequest.reason,
      cancellationRequest.reason,
    );
  }
  // 11. Validate data isolation - only this member's requests are returned
  for (const request of response.data) {
    TestValidator.equals(
      "data isolation - all requests belong to member",
      request.member.id,
      memberAuth.id,
    );
  }
}
