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

export async function test_api_refund_request_review_approval_by_responsible_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerIp = typia.random<string & tags.Format<"ipv4">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerIp = typia.random<string & tags.Format<"ipv4">>();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const joinedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: sellerIp,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinedSeller);
  const sellerConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: sellerIp,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loggedInSeller);
  TestValidator.equals(
    "seller login identity matches joined seller",
    loggedInSeller.id,
    joinedSeller.id,
  );
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: customerIp,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinedCustomer);
  const customerConnection: api.IConnection = { host: connection.host };
  const loggedInCustomer = await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: customerIp,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loggedInCustomer);
  TestValidator.equals(
    "customer login identity matches joined customer",
    loggedInCustomer.id,
    joinedCustomer.id,
  );
  const paymentAttemptBody = {
    amount: 100,
    gateway_provider: `test-gateway-${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallPaymentAttempt.ICreate;
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: paymentAttemptBody,
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to logged in customer",
    paymentAttempt.customer.id,
    loggedInCustomer.id,
  );
  TestValidator.equals(
    "payment attempt amount preserved",
    paymentAttempt.amount,
    paymentAttemptBody.amount,
  );
  TestValidator.equals(
    "payment attempt gateway provider preserved",
    paymentAttempt.gateway_provider,
    paymentAttemptBody.gateway_provider,
  );
  const reviewNote = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error(
    "seller cannot approve nonexistent refund request",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.update(
        sellerConnection,
        {
          refundRequestId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "approved",
            review_note: reviewNote,
          } satisfies IShoppingMallRefundRequest.IUpdate,
        },
      );
    },
  );
}
