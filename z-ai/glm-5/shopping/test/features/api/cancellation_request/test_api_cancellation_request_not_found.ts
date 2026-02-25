import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test error handling when attempting to retrieve a non-existent cancellation request.
 *
 * This test validates that the API properly handles requests for cancellation
 * requests that don't exist in the database. The system should return a 404
 * Not Found response instead of throwing an unhandled exception.
 *
 * **Preconditions:**
 * - Customer is authenticated with valid JWT token
 * - No cancellation request exists with the provided ID
 *
 * **Test Steps:**
 * 1. Authenticate as a valid customer using the join endpoint
 * 2. Generate a random UUID that does not exist in the database
 * 3. Call GET /shoppingMall/customer/cancellation-requests/{cancellationRequestId}
 *
 * **Expected Result:**
 * - HTTP 404 Not Found response
 */
export async function test_api_cancellation_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Generate a non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent cancellation request
  // Should return 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent cancellation request",
    404,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customerConnection,
        { cancellationRequestId: nonExistentId },
      );
    },
  );
}
