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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test seller retrieval of a rejected refund request.
 *
 * Validates the complete refund request rejection workflow including seller authentication, customer refund request creation, seller rejection, and post-rejection retrieval. Ensures that sellers can access rejected refund requests for dispute resolution and that the rejection state is correctly persisted with all required fields.
 *
 * The test verifies that after rejection: the status changes to 'rejected', the reviewed_at timestamp is populated, the customer's original reason is preserved, member and order item details remain intact, and the order item status stays 'delivered' (no refund processed).
 *
 * 1. Seller registers and logs in to access seller endpoints.
 * 2. Seller creates a product with a variant for purchase.
 * 3. Customer registers, places an order, and creates a refund request for the delivered order item.
 * 4. Seller rejects the refund request with a rejection comment.
 * 5. Seller retrieves the rejected refund request using the GET endpoint.
 * 6. Validates rejection state: status is 'rejected', reviewed_at is populated, reason preserved, order item details intact.
 */
export async function test_api_refund_request_seller_retrieval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register with credentials we can reuse
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Seller login with stored credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerAuth);
  // 2. Create product and variant
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
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
  // 3. Customer setup - register and create order
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Customer login with stored credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(customerAuth);
  // Create order (system derives items from customer's cart)
  const order =
    await generate_random_shopping_mall_member_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get the order item for refund request
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  // 4. Customer creates refund request for the order item
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: refundReason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request reason matches input",
    refundRequest.reason,
    refundReason,
  );
  // 5. Seller rejects the refund request
  const rejectionComment = RandomGenerator.paragraph({ sentences: 1 });
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.reject(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          sellerResponseComment: rejectionComment,
        } satisfies IShoppingMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRefundRequest);
  TestValidator.equals(
    "rejected status is correct",
    rejectedRefundRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at is populated after rejection",
    rejectedRefundRequest.reviewed_at !== null &&
      rejectedRefundRequest.reviewed_at !== undefined,
  );
  // 6. Seller retrieves the rejected refund request
  const retrievedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 7. Validate rejection state is correctly persisted
  TestValidator.equals(
    "retrieved status is rejected",
    retrievedRefundRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "retrieved reviewed_at is populated",
    retrievedRefundRequest.reviewed_at !== null &&
      retrievedRefundRequest.reviewed_at !== undefined,
  );
  TestValidator.equals(
    "customer reason preserved after rejection",
    retrievedRefundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "member details intact after rejection",
    retrievedRefundRequest.member.id,
    refundRequest.member.id,
  );
  TestValidator.equals(
    "order item details intact after rejection",
    retrievedRefundRequest.orderItem.id,
    refundRequest.orderItem.id,
  );
  TestValidator.equals(
    "order item status remains delivered after rejection",
    retrievedRefundRequest.orderItem.status,
    "delivered",
  );
}