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

export async function test_api_payment_update_failed_no_order_created(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a member account (sets authorization headers on this connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2) Create a payment attempt for the authenticated member
  const paymentCreated =
    await generate_random_shopping_mall_member_payments_create(
      memberConnection,
      {
        body: {
          amount: typia.random<number & tags.Minimum<0>>(),
          currency: "KRW",
          provider: `provider_${RandomGenerator.alphabets(8)}`,
          provider_reference: `ref_${RandomGenerator.alphabets(12)}`,
          orderPlacementContextId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallPayment.ICreate,
      },
    );
  typia.assert(paymentCreated);
  // 3) Update the payment attempt outcome to failed
  const failedPayload = {
    status: "failed",
    paid_at: null,
    error_code: `ERR_${RandomGenerator.alphabets(6)}`,
    error_message: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallPayment.IUpdate;
  const updatedPayment =
    await api.functional.shoppingMall.member.payments.updatePayment(
      memberConnection,
      {
        paymentId: paymentCreated.id,
        body: failedPayload,
      },
    );
  typia.assert(updatedPayment);
  // 4) Validate payment reflects failed outcome (no paid_at)
  TestValidator.equals("payment paid_at is null", updatedPayment.paid_at, null);
  TestValidator.equals(
    "payment error_code matches",
    updatedPayment.error_code,
    failedPayload.error_code,
  );
  TestValidator.equals(
    "payment error_message matches",
    updatedPayment.error_message,
    failedPayload.error_message,
  );
  // 5) Invariants for failed payment:
  // No order/order-item/cart/inventory DTOs/endpoints are provided in this task,
  // so we validate the failure side-effects observable through the payment record itself.
  TestValidator.equals(
    "payment id unchanged",
    updatedPayment.id,
    paymentCreated.id,
  );
}
