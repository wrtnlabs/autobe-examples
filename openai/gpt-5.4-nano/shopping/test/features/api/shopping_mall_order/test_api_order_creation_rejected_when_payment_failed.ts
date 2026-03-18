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

export async function test_api_order_creation_rejected_when_payment_failed(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = authorized.token.access;
  const paymentAttempts: number = 5;
  let failedPayment:
    | (IShoppingMallPayment & {
        __original_error_code?: string | null;
        __original_error_message?: string | null;
      })
    | undefined = undefined;
  for (let i = 0; i < paymentAttempts; i++) {
    const payment: IShoppingMallPayment =
      await generate_random_shopping_mall_member_payments_create(
        memberConnection,
        {},
      );
    typia.assert(payment);
    if (payment.paid_at === null) {
      // In this domain, paid_at === null indicates not successful.
      // Additionally, if error_code/error_message is present, treat as failed.
      if (payment.error_code !== null || payment.error_message !== null) {
        failedPayment = {
          ...payment,
        };
        break;
      }
    }
  }
  TestValidator.predicate(
    "payment should be failed (paid_at is null)",
    () => failedPayment !== undefined && failedPayment.paid_at === null,
  );

  if (failedPayment === undefined) {
    throw new Error("failedPayment is undefined");
  }

  const ensuredFailedPayment = typia.assert(failedPayment);

  const originalErrorCode: string | null = ensuredFailedPayment.error_code;
  const originalErrorMessage: string | null =
    ensuredFailedPayment.error_message;

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    shopping_mall_payment_id: ensuredFailedPayment.id,
    ship_to_name: RandomGenerator.name(),
    ship_to_phone: RandomGenerator.mobile(),
    ship_to_postal_code: RandomGenerator.alphabets(6),
    ship_to_region: RandomGenerator.name(2),
    ship_to_city: RandomGenerator.name(2),
    ship_to_street_address: RandomGenerator.paragraph({ sentences: 1 }),
    ship_to_detail_address: RandomGenerator.paragraph({ sentences: 1 }),
    shipping_instructions: null,
  };
  typia.assert(orderCreateBody);

  await TestValidator.error(
    "order creation should be rejected when payment failed",
    async () => {
      const result: IShoppingMallOrder =
        await api.functional.shoppingMall.member.orders.create(
          memberConnection,
          { body: orderCreateBody },
        );
      typia.assert(result);
    },
  );

  await TestValidator.error(
    "order creation should still be rejected for the same failed payment",
    async () => {
      const result: IShoppingMallOrder =
        await api.functional.shoppingMall.member.orders.create(
          memberConnection,
          { body: orderCreateBody },
        );
      typia.assert(result);
    },
  );

  // Transactional integrity: order creation must not modify the payment failure diagnostics.
  TestValidator.equals(
    "payment error_code preserved",
    ensuredFailedPayment.error_code,
    originalErrorCode,
  );
  TestValidator.equals(
    "payment error_message preserved",
    ensuredFailedPayment.error_message,
    originalErrorMessage,
  );
}
