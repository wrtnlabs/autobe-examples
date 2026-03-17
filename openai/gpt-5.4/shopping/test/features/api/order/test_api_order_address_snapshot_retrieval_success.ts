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

export async function test_api_order_address_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
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
          gateway_provider: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to joined customer",
    paymentAttempt.customer.id,
    authorized.id,
  );
  TestValidator.predicate(
    "payment attempt amount is positive",
    paymentAttempt.amount > 0,
  );
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const addressSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.customer.orders.addressSnapshots.getByOrderidAndAddresssnapshotid(
      customerConnection,
      {
        orderId,
        addressSnapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot is tied to requested parent order",
    snapshot.order.id,
    orderId,
  );
  TestValidator.equals(
    "snapshot id matches request",
    snapshot.id,
    addressSnapshotId,
  );
  TestValidator.predicate(
    "recipient name preserved",
    snapshot.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "phone number preserved",
    snapshot.phone_number.length > 0,
  );
  TestValidator.predicate(
    "street address preserved",
    snapshot.street_address.length > 0,
  );
  TestValidator.predicate("city preserved", snapshot.city.length > 0);
  TestValidator.predicate(
    "state province preserved",
    snapshot.state_province.length > 0,
  );
  TestValidator.predicate(
    "postal code preserved",
    snapshot.postal_code.length > 0,
  );
  TestValidator.predicate("country preserved", snapshot.country.length > 0);
}
