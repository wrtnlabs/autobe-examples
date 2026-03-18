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

export async function test_api_member_payment_erase_other_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Member A creates a payment attempt
  const memberAPayment =
    await generate_random_shopping_mall_member_payments_create(
      memberAConnection,
      {},
    );
  typia.assert(memberAPayment);
  const paymentIdA: string & tags.Format<"uuid"> = memberAPayment.id;
  // 3) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 4) Member B tries to erase member A's payment attempt (must be denied)
  await TestValidator.error(
    "member B cannot erase member A payment attempt",
    async () => {
      await api.functional.shoppingMall.member.payments.erase(
        memberBConnection,
        {
          paymentId: paymentIdA,
        },
      );
    },
  );
  // 5) Verify member A payment still exists by erasing as member A afterwards.
  await api.functional.shoppingMall.member.payments.erase(memberAConnection, {
    paymentId: paymentIdA,
  });
}
