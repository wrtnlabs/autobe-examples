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
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";

export async function test_api_member_payment_success_creates_order(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(member);
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers ??= {};
  authedConnection.headers.Authorization = member.token.access;
  const paymentAttempt: IShoppingMallPayment =
    await generate_random_shopping_mall_member_payments_create(
      authedConnection,
      {
        body: {
          amount: typia.random<number & tags.Minimum<0>>(),
          currency: "KRW",
          provider: "test-provider",
          provider_reference: typia.random<string & tags.MinLength<1>>(),
          orderPlacementContextId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallPayment.ICreate,
      },
    );
  typia.assert(paymentAttempt);
  const processRequest: IShoppingMallPayment.IRequest = {
    provider_reference: paymentAttempt.provider_reference,
    provider: paymentAttempt.provider,
    amount: paymentAttempt.amount,
    currency: paymentAttempt.currency,
    status: paymentAttempt.status,
    paid_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
    page: null,
    limit: null,
  };
  const processed: IShoppingMallPayment =
    await api.functional.shoppingMall.member.payments.processPayments(
      authedConnection,
      { body: processRequest },
    );
  typia.assert(processed);
  TestValidator.equals("payment id preserved", processed.id, paymentAttempt.id);
  TestValidator.equals("error_code is null", processed.error_code, null);
  TestValidator.equals("error_message is null", processed.error_message, null);
  TestValidator.predicate("paid_at is non-null", processed.paid_at !== null);
  const processedAgain: IShoppingMallPayment =
    await api.functional.shoppingMall.member.payments.processPayments(
      authedConnection,
      { body: processRequest },
    );
  typia.assert(processedAgain);
  TestValidator.equals(
    "idempotent payment id",
    processedAgain.id,
    processed.id,
  );
  TestValidator.equals(
    "idempotent error_code",
    processedAgain.error_code,
    null,
  );
  TestValidator.equals(
    "idempotent error_message",
    processedAgain.error_message,
    null,
  );
  TestValidator.predicate(
    "idempotent paid_at is non-null",
    processedAgain.paid_at !== null,
  );
}
