import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that retrieving a non-existent or deleted cancellation request returns appropriate 404 error.
 *
 * Validates that the cancellation request retrieval endpoint properly handles requests for cancellation requests that do not exist or have been deleted. Ensures that the system returns HTTP 404 status codes for both non-existent UUIDs and soft-deleted cancellation requests.
 *
 * 1. Register and authenticate as a customer
 * 2. Attempt to retrieve a cancellation request with a non-existent UUID
 * 3. Verify response returns HTTP 404 error
 * 4. Attempt to retrieve another non-existent cancellation request (simulating deleted request scenario)
 * 5. Verify response returns HTTP 404 error
 */
export async function test_api_cancellation_request_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Test Case 1: Non-existent cancellation request ID
  const nonExistentUuid1 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent cancellation request returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customerConnection,
        {
          cancellationRequestId: nonExistentUuid1,
        },
      ),
  );
  // 3. Test Case 2: Another non-existent UUID (simulating deleted request)
  const nonExistentUuid2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleted cancellation request returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customerConnection,
        {
          cancellationRequestId: nonExistentUuid2,
        },
      ),
  );
}
