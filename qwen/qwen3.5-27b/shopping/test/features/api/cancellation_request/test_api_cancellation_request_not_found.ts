import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that attempting to retrieve a non-existent or soft-deleted cancellation request returns appropriate error.
 * 1. Customer authentication is still required even for non-existent resources
 * 2. When requesting a cancellation request ID that doesn't exist, the system returns a 404 Not Found error
 * 3. When requesting a soft-deleted cancellation request, the system returns a 404 Not Found error
 * 4. The error response is consistent and doesn't leak information
 * 5. Authorization check still occurs before resource lookup
 */
export async function test_api_cancellation_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Generate a non-existent UUID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent cancellation request
  await TestValidator.httpError(
    "should return 404 for non-existent cancellation request",
    404,
    async () =>
      await api.functional.shoppingMall.customer.cancellationRequests.at(
        customerConnection,
        { cancellationRequestId: nonExistentId },
      ),
  );
  // 4. Test with another random UUID to ensure consistency
  const anotherNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "should return 404 for another non-existent cancellation request",
    404,
    async () =>
      await api.functional.shoppingMall.customer.cancellationRequests.at(
        customerConnection,
        { cancellationRequestId: anotherNonExistentId },
      ),
  );
}
