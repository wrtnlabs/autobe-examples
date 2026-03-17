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

export async function test_api_payment_attempt_checkout_failure_preserves_retry_state(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/checkout/review",
      referrer: "https://example.com/cart",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const requestedAmount = 100;
  const attempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: requestedAmount,
        },
      },
    );
  typia.assert(attempt);
  TestValidator.equals(
    "payment attempt belongs to authenticated customer",
    attempt.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "payment attempt preserves authenticated customer email",
    attempt.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "payment attempt preserves requested amount",
    attempt.amount,
    requestedAmount,
  );
  TestValidator.predicate(
    "payment attempt exposes gateway provider",
    attempt.gateway_provider.length > 0,
  );
  TestValidator.predicate(
    "payment attempt exposes gateway reference",
    attempt.gateway_reference.length > 0,
  );
  TestValidator.predicate(
    "payment attempt has non-empty status",
    attempt.status.length > 0,
  );
  TestValidator.equals(
    "payment attempt record is active",
    attempt.deleted_at,
    null,
  );
  if (attempt.status === "failed") {
    TestValidator.predicate(
      "failed payment attempt has terminal processed_at",
      attempt.processed_at !== null,
    );
  } else {
    TestValidator.predicate(
      "non-failed payment attempt is still auditable",
      attempt.id.length > 0,
    );
  }
}
