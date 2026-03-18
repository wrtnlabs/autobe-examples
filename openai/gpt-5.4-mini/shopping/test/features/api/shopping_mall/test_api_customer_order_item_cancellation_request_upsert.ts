import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_cancellation_request_upsert(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "qwer1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const output =
    await api.functional.shoppingMall.customer.orderItems.cancellation_request.update(
      customerConnection,
      {
        orderItemId,
        body: {
          reason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "cancellation request order item matches",
    output.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "cancellation request reason matches",
    output.reason,
    reason,
  );
  TestValidator.predicate(
    "cancellation request is pending",
    output.status === "pending",
  );
  const revisedReason = RandomGenerator.paragraph({ sentences: 4 });
  const revised =
    await api.functional.shoppingMall.customer.orderItems.cancellation_request.update(
      customerConnection,
      {
        orderItemId,
        body: {
          reason: revisedReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(revised);
  TestValidator.equals(
    "upsert keeps same order item",
    revised.orderItem.id,
    orderItemId,
  );
  TestValidator.equals("upsert updates reason", revised.reason, revisedReason);
  TestValidator.predicate(
    "upsert keeps pending status",
    revised.status === "pending",
  );
}
