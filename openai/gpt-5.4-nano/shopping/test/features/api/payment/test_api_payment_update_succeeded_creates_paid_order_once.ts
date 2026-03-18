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

export async function test_api_payment_update_succeeded_creates_paid_order_once(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const payment = await generate_random_shopping_mall_member_payments_create(
    memberConnection,
    {
      body: {
        amount: typia.random<number & tags.Minimum<0>>(),
        currency: "USD",
        provider: "test_provider",
        provider_reference: RandomGenerator.alphaNumeric(16),
        orderPlacementContextId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallPayment.ICreate,
    },
  );
  typia.assert(payment);
  const succeededAt = new Date().toISOString();
  const updated1 =
    await api.functional.shoppingMall.member.payments.updatePayment(
      memberConnection,
      {
        paymentId: payment.id,
        body: {
          status: "succeeded",
          paid_at: succeededAt,
        } satisfies IShoppingMallPayment.IUpdate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals("payment status", updated1.status, "succeeded");
  TestValidator.predicate("paid_at is non-null", updated1.paid_at !== null);
  const updated2 =
    await api.functional.shoppingMall.member.payments.updatePayment(
      memberConnection,
      {
        paymentId: payment.id,
        body: {
          status: "succeeded",
          paid_at: succeededAt,
        } satisfies IShoppingMallPayment.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals("payment id unchanged", updated2.id, updated1.id);
  TestValidator.equals(
    "payment status stable",
    updated2.status,
    updated1.status,
  );
  TestValidator.equals("paid_at stable", updated2.paid_at, updated1.paid_at);
}
