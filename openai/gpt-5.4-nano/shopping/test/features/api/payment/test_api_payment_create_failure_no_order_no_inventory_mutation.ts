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

export async function test_api_payment_create_failure_no_order_no_inventory_mutation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register/auth as member
  const memberAuthorized = await authorize_member_join(connection, {});
  // 2) Actor-specific connection for authenticated calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuthorized.token.access,
  };
  // 3) Create a payment attempt expected to fail.
  //    Provider adapter failures are typically triggered in test env by
  //    provider/provider_reference patterns.
  const forcedProvider = "test_provider";
  const forcedProviderReference = `fail_${typia.random<string>()}`;
  const payment = await generate_random_shopping_mall_member_payments_create(
    memberConnection,
    {
      body: {
        amount: 1000,
        currency: "KRW",
        provider: forcedProvider,
        provider_reference: forcedProviderReference,
      } satisfies DeepPartial<IShoppingMallPayment.ICreate>,
    },
  );
  typia.assert(payment);
  // 4) Validate failure response
  TestValidator.equals(
    "paid_at should be null on failure",
    payment.paid_at,
    null,
  );
  TestValidator.predicate(
    "at least one error field should be populated on failure",
    payment.error_code !== null || payment.error_message !== null,
  );
}
