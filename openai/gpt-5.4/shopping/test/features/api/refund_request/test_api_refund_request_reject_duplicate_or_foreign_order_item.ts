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
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_reject_duplicate_or_foreign_order_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(customer);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {},
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to first customer",
    paymentAttempt.customer.id,
    customer.id,
  );
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request belongs to first customer",
    refundRequest.customer.id,
    customer.id,
  );
  const originalRefundRequest = {
    ...refundRequest,
  } satisfies IShoppingMallRefundRequest;
  await TestValidator.error(
    "reject duplicate refund request for same order item",
    async () => {
      await generate_random_shopping_mall_customer_refund_requests_create(
        customerConnection,
        {
          body: {
            shopping_mall_order_item_id: refundRequest.orderItem.id,
            reason: RandomGenerator.paragraph({ sentences: 4 }),
          },
        },
      );
    },
  );
  TestValidator.equals(
    "original refund request remains intact after duplicate rejection",
    refundRequest,
    originalRefundRequest,
  );
  const foreignCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const foreignCustomer = await authorize_customer_join(
    foreignCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      },
    },
  );
  typia.assert(foreignCustomer);
  const foreignPaymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      foreignCustomerConnection,
      {},
    );
  typia.assert(foreignPaymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to foreign customer",
    foreignPaymentAttempt.customer.id,
    foreignCustomer.id,
  );
  await TestValidator.error(
    "reject refund request for another customer's order item",
    async () => {
      await generate_random_shopping_mall_customer_refund_requests_create(
        foreignCustomerConnection,
        {
          body: {
            shopping_mall_order_item_id: refundRequest.orderItem.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );
  TestValidator.equals(
    "original refund request remains intact after foreign access rejection",
    refundRequest,
    originalRefundRequest,
  );
  TestValidator.notEquals(
    "foreign customer differs from original customer",
    foreignCustomer.id,
    customer.id,
  );
}
