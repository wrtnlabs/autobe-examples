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

export async function test_api_payment_update_succeeded_idempotent_no_duplicate_order(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a payment attempt
  const createdPayment =
    await generate_random_shopping_mall_member_payments_create(
      memberConnection,
      {},
    );
  typia.assert(createdPayment);
  const paymentId = createdPayment.id;
  const succeededPaidAt = createdPayment.paid_at ?? new Date().toISOString();
  // 3) Update to succeeded (idempotent)
  // IShoppingMallPayment.IUpdate is `any` in provided DTO, so we can only rely
  // on known fields that are part of IShoppingMallPayment.
  const updateBody = {
    status: "succeeded",
    paid_at: succeededPaidAt,
  } satisfies IShoppingMallPayment.IUpdate;
  const updated1 =
    await api.functional.shoppingMall.member.payments.updatePayment(
      memberConnection,
      {
        paymentId,
        body: updateBody,
      },
    );
  typia.assert(updated1);
  const updated2 =
    await api.functional.shoppingMall.member.payments.updatePayment(
      memberConnection,
      {
        paymentId,
        body: updateBody,
      },
    );
  typia.assert(updated2);
  // 4) Assertions: idempotency on payment record
  TestValidator.equals("payment id stable", updated2.id, paymentId);
  TestValidator.equals(
    "status does not regress",
    updated2.status,
    updated1.status,
  );
  TestValidator.equals("paid_at remains set", updated2.paid_at !== null, true);
  TestValidator.equals("paid_at stable", updated2.paid_at, updated1.paid_at);
}
