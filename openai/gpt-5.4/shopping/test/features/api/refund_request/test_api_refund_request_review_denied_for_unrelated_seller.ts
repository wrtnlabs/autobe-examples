import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_review_denied_for_unrelated_seller(
  connection: api.IConnection,
): Promise<void> {
  const unrelatedSellerEmail = typia.random<string & tags.Format<"email">>();
  const unrelatedSellerPassword = typia.random<
    string & tags.Format<"password">
  >();
  const unrelatedSellerConnection: api.IConnection = { host: connection.host };
  const unrelatedSellerJoin = await authorize_seller_join(
    unrelatedSellerConnection,
    {
      body: {
        email: unrelatedSellerEmail,
        password: unrelatedSellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(unrelatedSellerJoin);
  const unrelatedSellerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_login(unrelatedSellerLoginConnection, {
    body: {
      email: unrelatedSellerEmail,
      password: unrelatedSellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  let paymentAttempt: IShoppingMallPaymentAttempt | null = null;
  let refundRequest: IShoppingMallRefundRequest | null = null;
  for (const _ of ArrayUtil.repeat(10, () => 0)) {
    paymentAttempt =
      await generate_random_shopping_mall_customer_payment_attempts_create(
        customerConnection,
        {},
      );
    typia.assert(paymentAttempt);
    refundRequest =
      await generate_random_shopping_mall_customer_refund_requests_create(
        customerConnection,
        {},
      );
    typia.assert(refundRequest);
    if (refundRequest.orderItem.seller.id !== unrelatedSellerJoin.id) break;
  }
  const safePaymentAttempt = typia.assert(paymentAttempt!);
  const safeRefundRequest = typia.assert(refundRequest!);
  void safePaymentAttempt;
  TestValidator.notEquals(
    "refund request item seller differs from unrelated seller",
    safeRefundRequest.orderItem.seller.id,
    unrelatedSellerJoin.id,
  );
  const initialStatus = safeRefundRequest.status;
  const initialReviewerRole = safeRefundRequest.reviewer_role;
  const initialReviewNote = safeRefundRequest.review_note;
  const initialReviewedAt = safeRefundRequest.reviewed_at;
  const initialUpdatedAt = safeRefundRequest.updated_at;
  const initialOrderItemId = safeRefundRequest.orderItem.id;
  const initialOrderItemStatus = safeRefundRequest.orderItem.status;
  const initialResponsibleSellerId = safeRefundRequest.orderItem.seller.id;
  await TestValidator.httpError(
    "unrelated seller cannot review another seller's refund request",
    [401, 403, 404, 409],
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.update(
        unrelatedSellerLoginConnection,
        {
          refundRequestId: safeRefundRequest.id,
          body: {
            status: "rejected",
            review_note: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallRefundRequest.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "captured refund request status remains unchanged locally",
    safeRefundRequest.status,
    initialStatus,
  );
  TestValidator.equals(
    "captured refund request reviewer role remains unchanged locally",
    safeRefundRequest.reviewer_role,
    initialReviewerRole,
  );
  TestValidator.equals(
    "captured refund request review note remains unchanged locally",
    safeRefundRequest.review_note,
    initialReviewNote,
  );
  TestValidator.equals(
    "captured refund request reviewed_at remains unchanged locally",
    safeRefundRequest.reviewed_at,
    initialReviewedAt,
  );
  TestValidator.equals(
    "captured refund request updated_at remains unchanged locally",
    safeRefundRequest.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals(
    "captured order item identity remains unchanged locally",
    safeRefundRequest.orderItem.id,
    initialOrderItemId,
  );
  TestValidator.equals(
    "captured order item status remains unchanged locally",
    safeRefundRequest.orderItem.status,
    initialOrderItemStatus,
  );
  TestValidator.equals(
    "captured responsible seller identity remains unchanged locally",
    safeRefundRequest.orderItem.seller.id,
    initialResponsibleSellerId,
  );
}
