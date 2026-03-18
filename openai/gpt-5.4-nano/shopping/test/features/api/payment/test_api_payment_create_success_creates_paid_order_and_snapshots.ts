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

export async function test_api_payment_create_success_creates_paid_order_and_snapshots(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);

  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    ...(authConnection.headers ?? {}),
    Authorization: member.token.access,
  };

  const paymentContext = prepare_random_shopping_mall_payment();

  const createPayload = typia.assert<{
    body?: {
      amount?: number & tags.Minimum<0>;
      currency?: string & tags.MinLength<1>;
      provider?: string & tags.MinLength<1>;
      provider_reference?: string & tags.MinLength<1>;
      orderPlacementContextId?: string & tags.Format<"uuid">;
    };
  }>(paymentContext as unknown);

  const payment = await generate_random_shopping_mall_member_payments_create(
    authConnection,
    createPayload,
  );
  typia.assert(payment);

  TestValidator.predicate("payment must be paid", payment.paid_at !== null);
}
