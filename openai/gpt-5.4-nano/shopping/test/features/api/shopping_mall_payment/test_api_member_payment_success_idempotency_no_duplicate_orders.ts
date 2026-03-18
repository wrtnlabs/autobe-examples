import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_payment_success_idempotency_no_duplicate_orders(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(member);
  // NOTE: Only available endpoint to create/update payment is PATCH /member/payments.
  // We generate a unique provider/provider_reference context and process it.
  const now = new Date().toISOString();
  const request1: IShoppingMallPayment.IRequest = {
    provider_reference: `${RandomGenerator.alphabets(10)}-${typia.random<number>()}`,
    provider: RandomGenerator.alphabets(12),
    amount: typia.random<number>(),
    currency: RandomGenerator.pick(["KRW", "USD", "EUR"] as const),
    status: "succeeded",
    paid_at: now,
    error_code: null,
    error_message: null,
    page: null,
    limit: null,
  } satisfies IShoppingMallPayment.IRequest;
  const payment1: IShoppingMallPayment =
    await api.functional.shoppingMall.member.payments.processPayments(
      memberConnection,
      { body: request1 },
    );
  typia.assert(payment1);
  // Idempotent retry with the exact same payment context
  const request2: IShoppingMallPayment.IRequest = {
    provider_reference: payment1.provider_reference,
    provider: payment1.provider,
    amount: payment1.amount,
    currency: payment1.currency,
    status: payment1.paid_at !== null ? "succeeded" : "succeeded",
    paid_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
    page: null,
    limit: null,
  } satisfies IShoppingMallPayment.IRequest;
  const payment2: IShoppingMallPayment =
    await api.functional.shoppingMall.member.payments.processPayments(
      memberConnection,
      { body: request2 },
    );
  typia.assert(payment2);
  TestValidator.equals("payment attempt id stable", payment2.id, payment1.id);
  TestValidator.equals("provider stable", payment2.provider, payment1.provider);
  TestValidator.equals(
    "provider_reference stable",
    payment2.provider_reference,
    payment1.provider_reference,
  );
  TestValidator.equals("still paid", payment2.paid_at !== null, true);
  TestValidator.equals("error_code null on success", payment2.error_code, null);
  TestValidator.equals(
    "error_message null on success",
    payment2.error_message,
    null,
  );
  // Conflicting transition attempt: should not contradict a successful payment outcome
  const conflictingRequest: IShoppingMallPayment.IRequest = {
    provider_reference: payment1.provider_reference,
    provider: payment1.provider,
    amount: payment1.amount,
    currency: payment1.currency,
    status: "failed",
    paid_at: null,
    error_code: RandomGenerator.alphaNumeric(10),
    error_message: RandomGenerator.paragraph({ sentences: 2 }),
    page: null,
    limit: null,
  } satisfies IShoppingMallPayment.IRequest;
  const payment3: IShoppingMallPayment =
    await api.functional.shoppingMall.member.payments.processPayments(
      memberConnection,
      { body: conflictingRequest },
    );
  typia.assert(payment3);
  TestValidator.equals(
    "id stable after conflicting retry",
    payment3.id,
    payment1.id,
  );
  TestValidator.equals(
    "still paid after conflicting retry",
    payment3.paid_at !== null,
    true,
  );
  TestValidator.equals(
    "error_code null after conflicting retry",
    payment3.error_code,
    null,
  );
  TestValidator.equals(
    "error_message null after conflicting retry",
    payment3.error_message,
    null,
  );
}
