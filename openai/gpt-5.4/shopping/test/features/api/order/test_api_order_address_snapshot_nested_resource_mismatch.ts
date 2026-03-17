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

export async function test_api_order_address_snapshot_nested_resource_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const firstAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: "test-gateway-a",
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(firstAttempt);
  const secondAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 200,
          gateway_provider: "test-gateway-b",
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(secondAttempt);
  TestValidator.notEquals(
    "payment attempts must be distinct",
    firstAttempt.id,
    secondAttempt.id,
  );
  TestValidator.equals(
    "first attempt belongs to authenticated customer",
    firstAttempt.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "second attempt belongs to authenticated customer",
    secondAttempt.customer.id,
    customer.id,
  );
  await TestValidator.httpError(
    "nested resource mismatch must not resolve by child id alone",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.orders.addressSnapshots.getByOrderidAndAddresssnapshotid(
        customerConnection,
        {
          orderId: firstAttempt.id,
          addressSnapshotId: secondAttempt.id,
        },
      );
    },
  );
}
