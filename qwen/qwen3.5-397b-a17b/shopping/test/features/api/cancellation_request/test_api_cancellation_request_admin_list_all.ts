import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of all cancellation requests with pagination.
 *
 * Validates that an administrator can access the platform-wide cancellation requests list endpoint. The test verifies the complete response structure including pagination metadata and cancellation request summaries with nested order item and customer information.
 *
 * This test ensures administrators have proper visibility into all cancellation requests across the platform for oversight and management purposes. The endpoint should return requests sorted by creation date descending (newest first) and exclude soft-deleted records.
 *
 * 1. Administrator account created via promotion workflow with randomized credentials.
 * 2. Admin connection established with authentication token.
 * 3. Cancellation requests retrieved with empty search criteria (no filters).
 * 4. Response validated for pagination structure and cancellation request data integrity.
 */
export async function test_api_cancellation_request_admin_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve all cancellation requests with empty search criteria
  const result: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // 5. Validate cancellation request structure if any exist
  if (result.data.length > 0) {
    const firstRequest = result.data[0];
    // Validate business logic fields
    TestValidator.predicate(
      "reason is not empty",
      firstRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "orderItem quantity is positive",
      firstRequest.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "orderItem price is positive",
      firstRequest.orderItem.price > 0,
    );
    TestValidator.predicate(
      "orderItem orderCode is not empty",
      firstRequest.orderItem.orderCode.length > 0,
    );
    TestValidator.predicate(
      "product name is not empty",
      firstRequest.orderItem.product.name.length > 0,
    );
    TestValidator.predicate(
      "product base_price is positive",
      firstRequest.orderItem.product.base_price > 0,
    );
    TestValidator.predicate(
      "seller email is not empty",
      firstRequest.orderItem.seller.email.length > 0,
    );
    TestValidator.predicate(
      "customer email is not empty",
      firstRequest.customer.email.length > 0,
    );
    // Validate nested object relationships exist
    TestValidator.predicate(
      "orderItem.product exists",
      firstRequest.orderItem.product !== undefined,
    );
    TestValidator.predicate(
      "orderItem.productVariant exists",
      firstRequest.orderItem.productVariant !== undefined,
    );
    TestValidator.predicate(
      "orderItem.seller exists",
      firstRequest.orderItem.seller !== undefined,
    );
    TestValidator.predicate(
      "customer exists",
      firstRequest.customer !== undefined,
    );
    // Validate customer profile may exist
    TestValidator.predicate(
      "customer.customerProfile is nullable",
      firstRequest.customer.customerProfile === null ||
        firstRequest.customer.customerProfile !== undefined,
    );
  }
}
