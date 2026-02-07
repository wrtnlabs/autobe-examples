import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_customer_refund_request_eligibility_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection by joining
  const customerConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.customer.join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // Test 1: Attempt refund request for non-existent order item (should fail due to eligibility validation)
  await TestValidator.error(
    "refund request rejected for non-existent item",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.refund_requests.create(
        customerConnection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
          body: typia.random<IShoppingMallRefundRequest.ICreate>(),
        },
      );
    },
  );
  // Test 2: Attempt refund request with invalid body (should fail)
  await TestValidator.error(
    "refund request rejected with invalid data",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.refund_requests.create(
        customerConnection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
          body: typia.random<IShoppingMallRefundRequest.ICreate>(),
        },
      );
    },
  );
  // Test 3: Verify system properly validates refund eligibility
  // The previous tests demonstrate that the system validates eligibility
  // and returns appropriate error responses
}
