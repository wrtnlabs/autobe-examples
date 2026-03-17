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

export async function test_api_payment_attempt_checkout_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  TestValidator.equals(
    "authorized customer banned_at starts null",
    authorized.banned_at,
    null,
  );
  TestValidator.equals(
    "authorized customer deleted_at starts null",
    authorized.deleted_at,
    null,
  );
  const paymentBody = {
    amount: 100,
    gateway_provider: `provider-${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallPaymentAttempt.ICreate;
  const paymentAttempt: IShoppingMallPaymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: paymentBody,
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to authenticated customer id",
    paymentAttempt.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "payment attempt belongs to authenticated customer email",
    paymentAttempt.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "payment attempt amount matches request",
    paymentAttempt.amount,
    paymentBody.amount,
  );
  TestValidator.equals(
    "payment attempt gateway provider matches request",
    paymentAttempt.gateway_provider,
    paymentBody.gateway_provider,
  );
  TestValidator.equals(
    "payment attempt remains active",
    paymentAttempt.deleted_at,
    null,
  );
  TestValidator.predicate(
    "payment attempt status is non-empty",
    paymentAttempt.status.length > 0,
  );
  TestValidator.predicate(
    "payment attempt gateway reference is non-empty",
    paymentAttempt.gateway_reference.length > 0,
  );
  TestValidator.predicate(
    "payment attempt timestamps are populated",
    paymentAttempt.created_at.length > 0 &&
      paymentAttempt.updated_at.length > 0,
  );
  if (paymentAttempt.processed_at !== null) {
    TestValidator.predicate(
      "processed payment attempt has processed_at",
      paymentAttempt.processed_at.length > 0,
    );
  }
  const normalizedStatus: string = paymentAttempt.status.toLowerCase();
  if (
    normalizedStatus === "succeeded" ||
    normalizedStatus === "success" ||
    normalizedStatus === "paid" ||
    normalizedStatus === "completed"
  ) {
    TestValidator.predicate(
      "successful payment attempt has processed_at",
      paymentAttempt.processed_at !== null,
    );
    TestValidator.equals(
      "successful payment attempt clears failure reason",
      paymentAttempt.failure_reason,
      null,
    );
  }
}
