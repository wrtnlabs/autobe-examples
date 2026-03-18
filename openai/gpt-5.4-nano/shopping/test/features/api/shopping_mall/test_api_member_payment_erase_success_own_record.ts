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

export async function test_api_member_payment_erase_success_own_record(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
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
  typia.assert(member!);
  const payment: IShoppingMallPayment =
    await generate_random_shopping_mall_member_payments_create(
      memberConnection,
      {},
    );
  typia.assert(payment!);
  await api.functional.shoppingMall.member.payments.erase(memberConnection, {
    paymentId: payment.id,
  });
  await TestValidator.error(
    "payment should be deleted and not accessible anymore",
    async () => {
      await api.functional.shoppingMall.member.payments.erase(
        memberConnection,
        {
          paymentId: payment.id,
        },
      );
    },
  );
}
