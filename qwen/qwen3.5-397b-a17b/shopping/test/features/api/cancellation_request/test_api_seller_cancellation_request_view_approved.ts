import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test seller viewing an approved cancellation request with response timestamps.
 *
 * Validates the complete cancellation request workflow from customer submission through seller approval to final retrieval. Ensures that when a seller approves a cancellation request, the responded_at timestamp is properly populated, the status transitions to 'approved', and the seller can subsequently retrieve the request with all audit information intact.
 *
 * The test verifies that the cancellation request lifecycle is properly tracked: initial creation with 'pending' status, seller approval action that sets responded_at and changes status to 'approved', and final retrieval showing the complete audit trail. This ensures sellers can access historical cancellation requests they have processed.
 *
 * 1. Seller registers and authenticates via seller join/login flow.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller creates a product variant with SKU code and option values.
 * 4. Customer registers and authenticates via member join/login flow.
 * 5. Customer creates an order containing the seller's product variant.
 * 6. Customer creates a cancellation request for the order item with reason.
 * 7. Seller approves the cancellation request via approve endpoint.
 * 8. Seller retrieves the cancellation request to verify approved status and timestamps.
 * 9. Validates status is 'approved', respondedAt is populated and after createdAt.
 */
export async function test_api_seller_cancellation_request_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.alphabets(5)}, Size: ${RandomGenerator.pick(["S", "M", "L", "XL"] as const)}`,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 5. Customer creates order with seller's product
  const order = await generate_random_shopping_mall_member_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  // Get the order item for the seller's product
  const orderItem = order.orderItems.find(
    (item) => item.product.id === product.id,
  );
  TestValidator.predicate(
    "order contains seller's product",
    () => orderItem !== undefined,
  );
  const targetOrderItem = orderItem!;
  // 6. Customer creates cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create(
      customerLoginConnection,
      {
        body: {
          order_item_id: targetOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller approves the cancellation request
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerLoginConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 8. Seller retrieves the approved cancellation request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.at(
      sellerLoginConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 9. Validate the retrieved request
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "respondedAt is populated",
    () => retrievedRequest.respondedAt !== null,
  );
  TestValidator.predicate(
    "respondedAt is after createdAt",
    () =>
      new Date(retrievedRequest.respondedAt!) >
      new Date(retrievedRequest.createdAt),
  );
  TestValidator.predicate(
    "updatedAt reflects approval action",
    () =>
      new Date(retrievedRequest.updatedAt) >=
      new Date(retrievedRequest.respondedAt!),
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "orderItem preserved",
    retrievedRequest.orderItem.id,
    targetOrderItem.id,
  );
  TestValidator.equals(
    "customer preserved",
    retrievedRequest.customer.id,
    customerAuth.id,
  );
}
