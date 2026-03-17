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

export async function test_api_payment_attempt_update_finalized_outcome_conflict(
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
  const created =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: `gateway_${RandomGenerator.alphabets(6)}`,
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(created);
  const initialProcessedAt =
    new Date().toISOString() satisfies string as string &
      tags.Format<"date-time">;
  const initialGatewayProvider = `provider_${RandomGenerator.alphabets(5)}`;
  const initialGatewayReference = `ref_${RandomGenerator.alphaNumeric(12)}`;
  const finalizedBody = {
    status: "succeeded",
    gateway_provider: initialGatewayProvider,
    gateway_reference: initialGatewayReference,
    failure_reason: null,
    processed_at: initialProcessedAt,
  } satisfies IShoppingMallPaymentAttempt.IUpdate;
  const finalized =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: created.id,
        body: finalizedBody,
      },
    );
  typia.assert(finalized);
  TestValidator.equals(
    "payment attempt id remains same after finalization",
    finalized.id,
    created.id,
  );
  TestValidator.equals(
    "customer id remains same after finalization",
    finalized.customer.id,
    created.customer.id,
  );
  TestValidator.equals(
    "finalized status is succeeded",
    finalized.status,
    finalizedBody.status,
  );
  TestValidator.equals(
    "gateway provider updated on finalization",
    finalized.gateway_provider,
    initialGatewayProvider,
  );
  TestValidator.equals(
    "gateway reference updated on finalization",
    finalized.gateway_reference,
    initialGatewayReference,
  );
  TestValidator.equals(
    "failure reason cleared on success finalization",
    finalized.failure_reason,
    null,
  );
  TestValidator.equals(
    "processed_at recorded on success finalization",
    finalized.processed_at,
    initialProcessedAt,
  );
  TestValidator.equals(
    "original amount preserved",
    finalized.amount,
    created.amount,
  );
  const conflictingProcessedAt = new Date(
    Date.now() + 1000,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const conflictingBody = {
    status: "failed",
    gateway_provider: initialGatewayProvider,
    gateway_reference: initialGatewayReference,
    failure_reason: RandomGenerator.paragraph({ sentences: 3 }),
    processed_at: conflictingProcessedAt,
  } satisfies IShoppingMallPaymentAttempt.IUpdate;
  await TestValidator.error(
    "reject conflicting overwrite of finalized payment outcome",
    async () => {
      await api.functional.shoppingMall.customer.paymentAttempts.update(
        customerConnection,
        {
          paymentAttemptId: created.id,
          body: conflictingBody,
        },
      );
    },
  );
  TestValidator.equals(
    "successful finalized status remains unchanged in local authoritative response",
    finalized.status,
    "succeeded",
  );
  TestValidator.equals(
    "successful finalized gateway provider remains unchanged in local authoritative response",
    finalized.gateway_provider,
    initialGatewayProvider,
  );
  TestValidator.equals(
    "successful finalized gateway reference remains unchanged in local authoritative response",
    finalized.gateway_reference,
    initialGatewayReference,
  );
  TestValidator.equals(
    "successful finalized failure reason remains cleared",
    finalized.failure_reason,
    null,
  );
  TestValidator.equals(
    "successful finalized processed_at remains unchanged in local authoritative response",
    finalized.processed_at,
    initialProcessedAt,
  );
  TestValidator.notEquals(
    "conflicting failed status was not applied to finalized response",
    finalized.status,
    conflictingBody.status,
  );
  TestValidator.notEquals(
    "conflicting failure reason was not applied to finalized response",
    finalized.failure_reason,
    conflictingBody.failure_reason,
  );
}
