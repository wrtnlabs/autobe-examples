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
 * Test seller retrieval of approved refund request.
 *
 * Validates the complete refund request workflow including seller and customer authentication, product and variant creation, order placement, refund request submission, seller approval, and final retrieval. Ensures that after a seller approves a refund request, they can still retrieve it with all expected fields populated correctly.
 *
 * The test verifies that the approval workflow correctly updates the refund request status to 'approved', populates the reviewed_at timestamp, preserves the original reason text, and maintains all member and order item references. This validates that sellers retain access to approved refund requests for record-keeping and audit purposes.
 *
 * 1. Seller registers and logs in to create product listing.
 * 2. Seller creates product with variant for customer purchase.
 * 3. Customer (member) registers and places order containing seller's product.
 * 4. Customer creates refund request for the delivered order item.
 * 5. Seller approves the refund request, changing status to 'approved'.
 * 6. Seller retrieves the approved refund request via GET endpoint.
 * 7. Validates response contains: status='approved', reviewed_at populated, reason preserved, member and orderItem details intact.
 */
export async function test_api_refund_request_seller_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create product and variant
  const product = await generate_random_shopping_mall_seller_products_create(
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
  // 3. Customer (member) setup - register and login
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoin = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberJoin);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberJoin.email,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 4. Customer places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 5. Customer creates refund request for order item
  const orderItem = order.orderItems[0];
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: refundReason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 6. Seller approves the refund request
  const approvedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefundRequest);
  // 7. Seller retrieves the approved refund request
  const retrievedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.at(
      sellerConnection,
      {
        refundRequestId: approvedRefundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 8. Validate the retrieved refund request
  TestValidator.equals(
    "status is approved",
    retrievedRefundRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    retrievedRefundRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRefundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "member id matches",
    retrievedRefundRequest.member.id,
    refundRequest.member.id,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRefundRequest.orderItem.id,
    refundRequest.orderItem.id,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedRefundRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRefundRequest.updated_at !== undefined,
  );
}
