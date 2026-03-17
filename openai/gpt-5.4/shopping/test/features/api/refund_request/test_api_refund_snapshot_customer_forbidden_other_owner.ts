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

export async function test_api_refund_snapshot_customer_forbidden_other_owner(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const originalCustomerConnection: api.IConnection = { host: connection.host };
  const originalCustomerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const unrelatedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email satisfies string as string & tags.Format<"email">,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const originalCustomerPassword = typia.random<
    string & tags.Format<"password">
  >();
  const originalCustomerJoin = await authorize_customer_join(
    originalCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: originalCustomerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(originalCustomerJoin);
  await authorize_customer_login(originalCustomerLoginConnection, {
    body: {
      email: originalCustomerJoin.email satisfies string as string &
        tags.Format<"email">,
      password: originalCustomerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      originalCustomerLoginConnection,
      {
        body: {
          amount: 100,
          gateway_provider: RandomGenerator.name(1),
        },
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to original customer",
    paymentAttempt.customer.id,
    originalCustomerJoin.id,
  );
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      originalCustomerLoginConnection,
      {
        body: {
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request belongs to original customer",
    refundRequest.customer.id,
    originalCustomerJoin.id,
  );
  TestValidator.equals(
    "refund request preserves submitted reason",
    refundRequest.reason,
    refundReason,
  );
  const reviewNote = RandomGenerator.paragraph({ sentences: 2 });
  const reviewedRefundRequest =
    await generate_random_shopping_mall_seller_refund_requests_responses_create(
      sellerConnection,
      {
        params: {
          refundRequestId: refundRequest.id,
        },
        body: {
          status: RandomGenerator.pick(["approved", "rejected"] as const),
          review_note: reviewNote,
        },
      },
    );
  typia.assert(reviewedRefundRequest);
  TestValidator.equals(
    "seller response updates the same refund request",
    reviewedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "seller response preserves review note",
    reviewedRefundRequest.review_note,
    reviewNote,
  );
  const unrelatedCustomerJoin = await authorize_customer_join(
    unrelatedCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(unrelatedCustomerJoin);
  await TestValidator.httpError(
    "unrelated customer cannot read another customer's refund snapshot",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.snapshots.at(
        unrelatedCustomerConnection,
        {
          refundRequestId: refundRequest.id,
          snapshotId: refundRequest.id,
        },
      );
    },
  );
}
