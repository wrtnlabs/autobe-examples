import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can retrieve a paginated list of all cancellation requests on the platform.
 *
 * Validates the administrator's ability to view all cancellation requests across the platform with proper pagination and data structure. The test verifies that administrators can access cancellation requests from all customers and sellers without restriction.
 *
 * Special attention is given to verifying the response structure, pagination metadata accuracy, and that each cancellation request includes complete customer and order item information.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Administrator retrieves paginated list of all cancellation requests with default parameters.
 * 3. Validates response structure matches IPageIShoppingMallCancellationRequest.ISummary schema.
 * 4. Verifies pagination metadata (current page, limit, total records, total pages).
 * 5. Validates each cancellation request includes required fields and nested objects.
 */
export async function test_api_administrator_cancellation_requests_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Retrieve all cancellation requests with default pagination
  const response =
    await api.functional.shoppingMall.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. Validate each cancellation request structure
  for (const request of response.data) {
    typia.assert(request);
    // Validate status is one of the allowed values
    TestValidator.predicate(
      `request ${request.id} has valid status`,
      ["pending", "approved", "rejected"].includes(request.status),
    );
    // Validate response_reason is null for pending, non-null for approved/rejected
    if (request.status === "pending") {
      TestValidator.equals(
        `request ${request.id} response_reason is null when pending`,
        request.response_reason,
        null,
      );
    } else {
      TestValidator.predicate(
        `request ${request.id} has response_reason when ${request.status}`,
        request.response_reason !== null,
      );
    }
    // Validate customer object (typia.assert already validates structure)
    typia.assert(request.customer);
    // Validate orderItem object (typia.assert already validates structure)
    typia.assert(request.orderItem);
    // Validate nested objects exist
    typia.assert(request.orderItem.order);
    typia.assert(request.orderItem.productVariant);
    typia.assert(request.orderItem.seller);
  }
  // 6. Validate sorting order (newest first by default)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    TestValidator.predicate(
      `results are sorted by created_at descending (newest first) at index ${i}`,
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
}
