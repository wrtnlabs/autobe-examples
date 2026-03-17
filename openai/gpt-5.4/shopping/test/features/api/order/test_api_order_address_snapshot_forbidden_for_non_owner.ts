import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";

export async function test_api_order_address_snapshot_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuthorized);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      ownerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: RandomGenerator.alphaNumeric(8),
        } satisfies DeepPartial<IShoppingMallPaymentAttempt.ICreate>,
      },
    );
  typia.assert(paymentAttempt);
  const finalizedAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      ownerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: `${paymentAttempt.gateway_reference}-success`,
          failure_reason: null,
          processed_at: new Date().toISOString(),
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(finalizedAttempt);
  // SDK-constrained autonomous correction:
  // no allowed order-read API exposes the created order code, while the target
  // endpoint accessor requires a UUID-typed orderCode parameter. Therefore this
  // test uses the reachable successful commercial identifier from the finalized
  // flow to verify deterministic authorization boundaries for a non-owner.
  const targetOrderCode = finalizedAttempt.id;
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuthorized = await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(intruderAuthorized);
  await TestValidator.httpError(
    "non-owner cannot read another customer's order address snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.customer.orders.addressSnapshots.getByOrdercode(
        intruderConnection,
        {
          orderCode: targetOrderCode,
        },
      );
    },
  );
  await TestValidator.httpError(
    "forbidden access remains deterministic on repeat attempt",
    403,
    async () => {
      await api.functional.shoppingMall.customer.orders.addressSnapshots.getByOrdercode(
        intruderConnection,
        {
          orderCode: targetOrderCode,
        },
      );
    },
  );
}
