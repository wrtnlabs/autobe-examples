import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";

export async function test_api_payment_create_idempotent_provider_reference_retry(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register and login as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.ILogin,
  });
  // 2) Create an order placement context (generator ensures consistent internal cart/payment context)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 3) Fixed provider_reference for idempotency retry
  const providerReference = `idempotent_${typia.random<string & tags.Format<"uuid">>()}`;
  // 4) Initiate payment attempt using generator with fixed provider_reference.
  //    We also pass the order-placement correlation id via overrides.
  //    Since the DTO does not expose orderPlacementContextId directly,
  //    we reuse the payment id from the created order as the correlate.
  //    Generator should accept/validate it as a UUID.
  const orderPlacementContextId = order.payment.id;
  const paymentBody: IShoppingMallPayment.ICreate = {
    ...typia.random<IShoppingMallPayment.ICreate>(),
    provider_reference: providerReference,
    orderPlacementContextId,
  };
  const payment1 = await generate_random_shopping_mall_member_payments_create(
    memberConnection,
    {
      body: paymentBody,
    },
  );
  typia.assert(payment1);
  const payment2 = await generate_random_shopping_mall_member_payments_create(
    memberConnection,
    {
      body: paymentBody,
    },
  );
  typia.assert(payment2);
  // 5) Validate idempotency: retry should not create a different payment record for the same reference
  TestValidator.equals(
    "payment id should be identical on idempotent retry",
    payment2.id,
    payment1.id,
  );
}
