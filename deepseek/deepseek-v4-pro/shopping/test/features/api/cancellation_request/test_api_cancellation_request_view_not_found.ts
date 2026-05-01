import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that retrieving a non-existent cancellation request returns 404 Not Found.
 *
 * Validates that the cancellation request retrieval endpoint correctly handles requests for resources that do not exist in the system. A newly registered customer attempts to access a cancellation request using a randomly generated UUID that has no corresponding record in the database.
 *
 * This test ensures the system properly distinguishes between non-existent resources and unauthorized access attempts. Soft-deleted cancellation requests are also excluded from query results, and a 404 is the appropriate response in both cases.
 *
 * 1. A customer registers on the platform with randomized credentials.
 * 2. The customer attempts to view a cancellation request using a UUID that does not match any existing record.
 * 3. The endpoint responds with a 404 Not Found error, confirming proper handling of missing resources.
 */
export async function test_api_cancellation_request_view_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent cancellation request returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customerConnection,
        { requestId: nonExistentId },
      ),
  );
}
