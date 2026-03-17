import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";

export async function test_api_payment_attempt_update_failure_preserves_retry_state(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const createBody = {
    amount: 12500,
    gateway_provider: `gateway_${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallPaymentAttempt.ICreate;
  const created =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  const processedAt =
    new Date().toISOString() satisfies string as string as string &
      tags.Format<"date-time">;
  const failureReason = RandomGenerator.paragraph({ sentences: 3 });
  const gatewayReference = `fail_${RandomGenerator.alphaNumeric(12)}`;
  const updateBody = {
    status: "failed",
    gateway_provider: created.gateway_provider,
    gateway_reference: gatewayReference,
    failure_reason: failureReason,
    processed_at: processedAt,
  } satisfies IShoppingMallPaymentAttempt.IUpdate;
  const updated =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "payment attempt id is preserved",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "payment amount is preserved after failure",
    updated.amount,
    created.amount,
  );
  TestValidator.equals(
    "customer ownership id is preserved",
    updated.customer.id,
    created.customer.id,
  );
  TestValidator.equals(
    "customer ownership email is preserved",
    updated.customer.email,
    created.customer.email,
  );
  TestValidator.equals(
    "customer matches authorized actor",
    updated.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "gateway provider remains consistent",
    updated.gateway_provider,
    created.gateway_provider,
  );
  TestValidator.equals("failed status is recorded", updated.status, "failed");
  TestValidator.equals(
    "gateway reference is stored",
    updated.gateway_reference,
    gatewayReference,
  );
  TestValidator.equals(
    "failure reason is stored",
    updated.failure_reason,
    failureReason,
  );
  TestValidator.equals(
    "processed timestamp is recorded",
    updated.processed_at,
    processedAt,
  );
  TestValidator.equals(
    "creation timestamp is preserved",
    updated.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "failed attempt remains active",
    updated.deleted_at,
    null,
  );
  TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    updated.updated_at >= created.updated_at,
  );
  TestValidator.predicate(
    "failed payment is not treated as succeeded",
    updated.status !== "succeeded",
  );
  TestValidator.predicate(
    "failure keeps a gateway failure reason for retryable troubleshooting",
    updated.failure_reason !== null,
  );
  TestValidator.predicate(
    "failure is marked as processed",
    updated.processed_at !== null,
  );
}
