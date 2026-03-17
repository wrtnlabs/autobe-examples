import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function test_api_order_items_forbidden_for_other_customer_order(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(owner);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      ownerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: "stripe",
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to owner",
    paymentAttempt.customer.id,
    owner.id,
  );
  const originalPaymentAttempt = {
    id: paymentAttempt.id,
    customerId: paymentAttempt.customer.id,
    amount: paymentAttempt.amount,
    status: paymentAttempt.status,
    gatewayProvider: paymentAttempt.gateway_provider,
    gatewayReference: paymentAttempt.gateway_reference,
    failureReason: paymentAttempt.failure_reason,
    processedAt: paymentAttempt.processed_at,
    createdAt: paymentAttempt.created_at,
    updatedAt: paymentAttempt.updated_at,
    deletedAt: paymentAttempt.deleted_at,
  };
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruder = await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(intruder);
  TestValidator.notEquals("customers must differ", intruder.id, owner.id);
  const request = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IShoppingMallOrderItem.IRequest;
  await TestValidator.httpError(
    "other customer cannot inspect another customer's order items",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.orders.items.index(
        intruderConnection,
        {
          orderId: paymentAttempt.id,
          body: request,
        },
      );
    },
  );
  TestValidator.equals(
    "payment attempt id preserved",
    paymentAttempt.id,
    originalPaymentAttempt.id,
  );
  TestValidator.equals(
    "payment attempt owner preserved",
    paymentAttempt.customer.id,
    originalPaymentAttempt.customerId,
  );
  TestValidator.equals(
    "payment attempt amount preserved",
    paymentAttempt.amount,
    originalPaymentAttempt.amount,
  );
  TestValidator.equals(
    "payment attempt status preserved",
    paymentAttempt.status,
    originalPaymentAttempt.status,
  );
  TestValidator.equals(
    "gateway provider preserved",
    paymentAttempt.gateway_provider,
    originalPaymentAttempt.gatewayProvider,
  );
  TestValidator.equals(
    "gateway reference preserved",
    paymentAttempt.gateway_reference,
    originalPaymentAttempt.gatewayReference,
  );
  TestValidator.equals(
    "failure reason preserved",
    paymentAttempt.failure_reason,
    originalPaymentAttempt.failureReason,
  );
  TestValidator.equals(
    "processed timestamp preserved",
    paymentAttempt.processed_at,
    originalPaymentAttempt.processedAt,
  );
  TestValidator.equals(
    "creation timestamp preserved",
    paymentAttempt.created_at,
    originalPaymentAttempt.createdAt,
  );
  TestValidator.equals(
    "update timestamp preserved",
    paymentAttempt.updated_at,
    originalPaymentAttempt.updatedAt,
  );
  TestValidator.equals(
    "deletion timestamp preserved",
    paymentAttempt.deleted_at,
    originalPaymentAttempt.deletedAt,
  );
}
