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

export async function test_api_payment_attempt_update_success_idempotent(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const amount = typia.random<
    number & tags.Minimum<1>
  >() satisfies number as number;
  const gatewayProvider = `provider-${RandomGenerator.alphabets(6)}`;
  const created =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount,
          gateway_provider: gatewayProvider,
        },
      },
    );
  typia.assert(created);
  const processedAt = new Date().toISOString() satisfies string as string &
    tags.Format<"date-time">;
  const successStatus = "succeeded";
  const gatewayReference = `gw_${RandomGenerator.alphaNumeric(16)}`;
  const updateBody = {
    status: successStatus,
    gateway_reference: gatewayReference,
    failure_reason: null,
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
    "same payment attempt id after success finalization",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "same customer id preserved",
    updated.customer.id,
    created.customer.id,
  );
  TestValidator.equals(
    "same customer email preserved",
    updated.customer.email,
    created.customer.email,
  );
  TestValidator.equals(
    "same customer banned_at preserved",
    updated.customer.banned_at,
    created.customer.banned_at,
  );
  TestValidator.equals(
    "same customer created_at preserved",
    updated.customer.created_at,
    created.customer.created_at,
  );
  TestValidator.equals(
    "same customer updated_at preserved",
    updated.customer.updated_at,
    created.customer.updated_at,
  );
  TestValidator.equals(
    "same customer deleted_at preserved",
    updated.customer.deleted_at,
    created.customer.deleted_at,
  );
  TestValidator.equals("same amount preserved", updated.amount, created.amount);
  TestValidator.equals(
    "same gateway provider preserved",
    updated.gateway_provider,
    created.gateway_provider,
  );
  TestValidator.equals(
    "success status recorded",
    updated.status,
    successStatus,
  );
  TestValidator.equals(
    "gateway reference stored",
    updated.gateway_reference,
    gatewayReference,
  );
  TestValidator.equals("failure reason cleared", updated.failure_reason, null);
  TestValidator.equals(
    "processed_at stored",
    updated.processed_at,
    processedAt,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at after success finalization",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );
  TestValidator.equals("record remains active", updated.deleted_at, null);
  const updatedAgain =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAgain);
  TestValidator.equals(
    "idempotent callback keeps same payment attempt id",
    updatedAgain.id,
    updated.id,
  );
  TestValidator.equals(
    "idempotent callback keeps same customer id",
    updatedAgain.customer.id,
    updated.customer.id,
  );
  TestValidator.equals(
    "idempotent callback keeps same customer email",
    updatedAgain.customer.email,
    updated.customer.email,
  );
  TestValidator.equals(
    "idempotent callback keeps same customer banned_at",
    updatedAgain.customer.banned_at,
    updated.customer.banned_at,
  );
  TestValidator.equals(
    "idempotent callback keeps same customer created_at",
    updatedAgain.customer.created_at,
    updated.customer.created_at,
  );
  TestValidator.equals(
    "idempotent callback keeps same customer updated_at",
    updatedAgain.customer.updated_at,
    updated.customer.updated_at,
  );
  TestValidator.equals(
    "idempotent callback keeps same customer deleted_at",
    updatedAgain.customer.deleted_at,
    updated.customer.deleted_at,
  );
  TestValidator.equals(
    "idempotent callback keeps same amount",
    updatedAgain.amount,
    updated.amount,
  );
  TestValidator.equals(
    "idempotent callback keeps gateway provider",
    updatedAgain.gateway_provider,
    updated.gateway_provider,
  );
  TestValidator.equals(
    "idempotent callback keeps success status",
    updatedAgain.status,
    successStatus,
  );
  TestValidator.equals(
    "idempotent callback keeps gateway reference",
    updatedAgain.gateway_reference,
    gatewayReference,
  );
  TestValidator.equals(
    "idempotent callback keeps cleared failure reason",
    updatedAgain.failure_reason,
    null,
  );
  TestValidator.equals(
    "idempotent callback keeps processed_at",
    updatedAgain.processed_at,
    processedAt,
  );
  TestValidator.equals(
    "idempotent callback keeps active record",
    updatedAgain.deleted_at,
    null,
  );
}
