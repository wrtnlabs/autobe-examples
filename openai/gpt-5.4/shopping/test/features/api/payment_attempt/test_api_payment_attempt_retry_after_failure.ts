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

export async function test_api_payment_attempt_retry_after_failure(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const createBody = {
    amount: 100,
    gateway_provider: "stripe",
  } satisfies IShoppingMallPaymentAttempt.ICreate;
  const firstAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(firstAttempt);
  const secondAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(secondAttempt);
  TestValidator.equals(
    "authorized customer id matches first attempt customer",
    firstAttempt.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "authorized customer id matches second attempt customer",
    secondAttempt.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "authorized customer email matches first attempt customer",
    firstAttempt.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "authorized customer email matches second attempt customer",
    secondAttempt.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "first attempt amount matches request",
    firstAttempt.amount,
    createBody.amount,
  );
  TestValidator.equals(
    "second attempt amount matches request",
    secondAttempt.amount,
    createBody.amount,
  );
  TestValidator.equals(
    "first attempt gateway provider matches request",
    firstAttempt.gateway_provider,
    createBody.gateway_provider,
  );
  TestValidator.equals(
    "second attempt gateway provider matches request",
    secondAttempt.gateway_provider,
    createBody.gateway_provider,
  );
  TestValidator.equals(
    "retry uses same amount as first attempt",
    secondAttempt.amount,
    firstAttempt.amount,
  );
  TestValidator.equals(
    "retry uses same gateway provider as first attempt",
    secondAttempt.gateway_provider,
    firstAttempt.gateway_provider,
  );
  TestValidator.equals(
    "retry attempt belongs to same customer id as first attempt",
    secondAttempt.customer.id,
    firstAttempt.customer.id,
  );
  TestValidator.equals(
    "retry attempt belongs to same customer email as first attempt",
    secondAttempt.customer.email,
    firstAttempt.customer.email,
  );
  TestValidator.notEquals(
    "retry creates a new payment attempt id",
    firstAttempt.id,
    secondAttempt.id,
  );
  TestValidator.notEquals(
    "retry creates a new gateway reference",
    firstAttempt.gateway_reference,
    secondAttempt.gateway_reference,
  );
}
