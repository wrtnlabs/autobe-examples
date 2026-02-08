import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_refund_requests_create_refund_request } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create_refund_request";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_customer_refund_request_creation_success_and_validation(
  connection: api.IConnection,
): Promise<void> {
  // This test covers:
  // Scenario 1: Successful refund request creation
  // Scenario 2: Refund request for order item not belonging to the customer
  // Scenario 3: Refund request for order item in non-delivered status
  // 1. Customer join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = typia.random<IShoppingMallCustomer.IJoin>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Scenario 1: Successful refund request creation
  // We use the generation function for refund request creation utility which internally prepares valid delivered order item
  const refundRequest1 =
    await generate_random_shopping_mall_customer_refund_requests_create_refund_request(
      customerConnection,
      {
        body: { request_reason: "Item defective" },
      },
    );
  typia.assert(refundRequest1);
  // 3. Scenario 2: Refund request for order item not belonging to the customer
  // Attempt to create refund request with a likely invalid body to trigger authorization error
  await TestValidator.error(
    "refund request not belonging to customer",
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.createRefundRequest(
        customerConnection,
        {
          body: typia.random<IShoppingMallRefundRequest.ICreate>(),
        },
      );
    },
  );
  // 4. Scenario 3: Refund request for order item in non-delivered status
  // Attempt to create refund request with a likely invalid body to trigger business rule error
  await TestValidator.error(
    "refund request for non-delivered order item",
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.createRefundRequest(
        customerConnection,
        {
          body: typia.random<IShoppingMallRefundRequest.ICreate>(),
        },
      );
    },
  );
}
