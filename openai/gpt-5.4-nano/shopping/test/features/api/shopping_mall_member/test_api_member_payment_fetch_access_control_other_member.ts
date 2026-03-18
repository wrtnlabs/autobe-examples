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

export async function test_api_member_payment_fetch_access_control_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // 2) Member A creates a persisted payment attempt
  const payment = await generate_random_shopping_mall_member_payments_create(
    memberAConnection,
    {
      body: {
        amount: typia.random<number & tags.Minimum<0>>(),
        currency: typia.random<string & tags.MinLength<1>>(),
        provider: typia.random<string & tags.MinLength<1>>(),
        provider_reference: typia.random<string & tags.MinLength<1>>(),
        orderPlacementContextId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallPayment.ICreate,
    },
  );
  typia.assert(payment);
  // 3) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // 4) Member B attempts to fetch Member A's payment
  await TestValidator.httpError(
    "member b must not access member a payment",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.member.payments.at(memberBConnection, {
        paymentId: payment.id,
      });
    },
  );
  // 5) Unauthenticated request must be rejected
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated request must be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.member.payments.at(unauthConnection, {
        paymentId: payment.id,
      });
    },
  );
}
