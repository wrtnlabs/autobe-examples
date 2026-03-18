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

export async function test_api_member_payment_failure_does_not_create_order(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers ??= {};
  authorizedConnection.headers.Authorization = memberAuth.token.access;
  const createPayment =
    await generate_random_shopping_mall_member_payments_create(
      authorizedConnection,
      {
        body: {
          amount: (typia.random<number & tags.Minimum<0>>() +
            1) satisfies number & tags.Minimum<0>,
          currency: typia.random<string & tags.MinLength<1>>(),
          provider: "test_provider" satisfies string & tags.MinLength<1>,
          provider_reference: typia.random<string & tags.MinLength<1>>(),
          orderPlacementContextId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallPayment.ICreate,
      },
    );
  typia.assert(createPayment);
  const providerErrorCode = typia.random<string>();
  const providerErrorMessage = RandomGenerator.paragraph({ sentences: 2 });
  const processPayment =
    await api.functional.shoppingMall.member.payments.processPayments(
      authorizedConnection,
      {
        body: {
          provider: createPayment.provider,
          provider_reference: createPayment.provider_reference,
          amount: createPayment.amount,
          currency: createPayment.currency,
          status: "failed",
          paid_at: null,
          error_code: providerErrorCode,
          error_message: providerErrorMessage,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(processPayment);
  // Validate failed outcome fields (status string may be implementation-specific)
  TestValidator.equals("paid_at remains null", processPayment.paid_at, null);
  TestValidator.predicate(
    "error_code is non-null",
    processPayment.error_code !== null,
  );
  TestValidator.predicate(
    "error_message is non-null",
    processPayment.error_message !== null,
  );
}
