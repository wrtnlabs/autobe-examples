import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_seller_refund_requests_responses_create } from "../../../generate/generate_random_shopping_mall_seller_refund_requests_responses_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_refund_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_refund_request_snapshot";

export async function test_api_refund_snapshot_customer_view_own_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Aa1!Aa1!Aa1!";
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 10000,
          gateway_provider: RandomGenerator.pick([
            "stripe",
            "paypal",
            "kakao_pay",
            "naver_pay",
          ] as const),
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to customer",
    paymentAttempt.customer.id,
    customerAuth.id,
  );
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request belongs to customer",
    refundRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "refund request reason preserved",
    refundRequest.reason,
    refundReason,
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const reviewNote = RandomGenerator.paragraph({ sentences: 2 });
  const reviewedRefundRequest =
    await generate_random_shopping_mall_seller_refund_requests_responses_create(
      sellerConnection,
      {
        params: {
          refundRequestId: refundRequest.id,
        },
        body: {
          status: "approved",
          review_note: reviewNote,
        } satisfies IShoppingMallRefundRequestSnapshot.ICreate,
      },
    );
  typia.assert(reviewedRefundRequest);
  TestValidator.equals(
    "reviewed refund request id unchanged",
    reviewedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "original refund reason preserved after review",
    reviewedRefundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "review note recorded",
    reviewedRefundRequest.review_note,
    reviewNote,
  );
  TestValidator.predicate(
    "refund status updated after seller response",
    reviewedRefundRequest.status !== refundRequest.status,
  );
  TestValidator.predicate(
    "review timestamp recorded",
    reviewedRefundRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer role recorded",
    reviewedRefundRequest.reviewer_role !== null,
  );
  const customerReloginConnection: api.IConnection = { host: connection.host };
  const customerRelogin = await authorize_customer_login(
    customerReloginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerRelogin);
  TestValidator.equals(
    "relogin returns same customer id",
    customerRelogin.id,
    customerAuth.id,
  );
  if (connection.simulate === true) {
    const snapshot =
      await api.functional.shoppingMall.customer.refund_requests.snapshots.at(
        customerReloginConnection,
        {
          refundRequestId: refundRequest.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot belongs to refund request",
      snapshot.refundRequest.id,
      refundRequest.id,
    );
  }
  TestValidator.equals(
    "read preparation kept refund request id stable",
    reviewedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "read preparation kept customer ownership stable",
    reviewedRefundRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "read preparation kept original reason stable",
    reviewedRefundRequest.reason,
    refundRequest.reason,
  );
}
