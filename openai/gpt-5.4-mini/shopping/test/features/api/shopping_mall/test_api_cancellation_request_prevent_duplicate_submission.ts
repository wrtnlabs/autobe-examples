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
import { generate_random_shopping_mall_customer_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_request_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_prevent_duplicate_submission(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com/signup",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await api.functional.shoppingMall.customer.order_items.cancellation_request.create(
      customerConnection,
      {
        orderItemId,
        body: { reason } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "cancellation request reason should match",
    firstRequest.reason,
    reason,
  );
  TestValidator.equals(
    "cancellation request order item should match",
    firstRequest.orderItem.id,
    orderItemId,
  );
  await TestValidator.error(
    "duplicate cancellation request should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.order_items.cancellation_request.create(
        customerConnection,
        {
          orderItemId,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallCancellationRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original cancellation request reason should remain unchanged",
    firstRequest.reason,
    reason,
  );
  TestValidator.equals(
    "original cancellation request order item should remain unchanged",
    firstRequest.orderItem.id,
    orderItemId,
  );
}
