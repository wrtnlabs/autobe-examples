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
 * Test seller retrieval of pending refund request for order item.
 *
 * Validates that a seller can successfully retrieve a pending refund request submitted by a customer for an order item from their shop. The test verifies the complete refund request workflow from order creation through refund request submission and seller retrieval.
 *
 * The test ensures that sellers have proper access to view refund requests for their products, which is critical for the seller review workflow. The refund request must be in 'pending' status, indicating it awaits the seller's approval or rejection decision.
 *
 * 1. Seller registers and logs in to the platform.
 * 2. Seller creates a product with a variant for purchase.
 * 3. Customer (member) registers and places an order for the seller's product variant.
 * 4. Customer creates a refund request for the delivered order item.
 * 5. Seller retrieves the refund request using the refund request ID.
 * 6. Validates response contains all required fields: id, member, orderItem, reason, status='pending', reviewed_at=null, created_at, updated_at.
 */
export async function test_api_refund_request_seller_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register with known password
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
  // 2. Seller login with same credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Create product for seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // 4. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer (member) setup - register with known password
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 6. Member login with same credentials
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 7. Customer places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberLoginConnection,
    {},
  );
  typia.assert(order);
  // 8. Get the order item for refund request
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 9. Customer creates refund request for the order item
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberLoginConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 10. Seller retrieves the refund request
  const retrievedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.at(
      sellerLoginConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 11. Validate refund request details
  TestValidator.equals(
    "refund request ID matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "status is pending",
    retrievedRefundRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "reviewed_at is null",
    retrievedRefundRequest.reviewed_at === null,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedRefundRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.predicate(
    "reason is not empty",
    retrievedRefundRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedRefundRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRefundRequest.updated_at.length > 0,
  );
}
