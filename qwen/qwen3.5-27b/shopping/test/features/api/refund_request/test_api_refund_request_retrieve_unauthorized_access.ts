import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that a customer cannot retrieve another customer's refund request (authorization enforcement).
 *
 * This test validates that the authorization system correctly prevents customers
 * from accessing refund requests that belong to other customers. It creates two
 * separate customer accounts, has one customer create a refund request, then
 * attempts to access that refund request using the second customer's credentials.
 *
 * Expected behavior: The system should return HTTP 403 Forbidden when customer B
 * tries to access customer A's refund request.
 */
export async function test_api_refund_request_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Create a refund request as customer A
  // Note: In a real scenario, this would require a delivered order item.
  // For this test, we use the utility function which handles the setup.
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerAConnection,
      {},
    );
  typia.assert(refundRequest);
  // 3. Register and authenticate as customer B (different account)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 4. Verify that customer A and customer B are different
  TestValidator.notEquals("customer IDs differ", customerA.id, customerB.id);
  // 5. Attempt to retrieve customer A's refund request using customer B's credentials
  // This should fail with HTTP 403 Forbidden due to authorization enforcement
  await TestValidator.httpError(
    "unauthorized access returns 403",
    403,
    async () =>
      await api.functional.shoppingMall.customer.refund_requests.at(
        customerBConnection,
        {
          refundRequestId: refundRequest.id,
        },
      ),
  );
}
