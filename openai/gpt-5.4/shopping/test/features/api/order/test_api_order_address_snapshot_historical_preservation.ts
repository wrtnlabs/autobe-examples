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

export async function test_api_order_address_snapshot_historical_preservation(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >() satisfies number as number,
          gateway_provider: RandomGenerator.alphaNumeric(8),
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to authorized customer",
    paymentAttempt.customer.id,
    authorized.id,
  );
  TestValidator.predicate(
    "payment attempt amount is positive",
    paymentAttempt.amount > 0,
  );
  TestValidator.predicate(
    "payment attempt has status",
    paymentAttempt.status.length > 0,
  );
  TestValidator.predicate(
    "payment attempt has gateway provider",
    paymentAttempt.gateway_provider.length > 0,
  );
  TestValidator.predicate(
    "payment attempt has gateway reference",
    paymentAttempt.gateway_reference.length > 0,
  );
  const snapshot =
    await api.functional.shoppingMall.customer.orders.addressSnapshots.getByOrderidAndAddresssnapshotid(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        addressSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate(
    "snapshot has readable order code",
    snapshot.order.code.length > 0,
  );
  TestValidator.predicate(
    "snapshot order total price is non negative",
    snapshot.order.total_price >= 0,
  );
  TestValidator.predicate(
    "snapshot order status is readable",
    snapshot.order.status.length > 0,
  );
  TestValidator.predicate(
    "snapshot recipient name is readable",
    snapshot.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot phone number is readable",
    snapshot.phone_number.length > 0,
  );
  TestValidator.predicate(
    "snapshot street address is readable",
    snapshot.street_address.length > 0,
  );
  TestValidator.predicate(
    "snapshot city is readable",
    snapshot.city.length > 0,
  );
  TestValidator.predicate(
    "snapshot state province is readable",
    snapshot.state_province.length > 0,
  );
  TestValidator.predicate(
    "snapshot postal code is readable",
    snapshot.postal_code.length > 0,
  );
  TestValidator.predicate(
    "snapshot country is readable",
    snapshot.country.length > 0,
  );
}
