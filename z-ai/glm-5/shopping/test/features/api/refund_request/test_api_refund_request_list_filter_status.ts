import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
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

/**
 * Test filtering refund requests by status field.
 *
 * Validates that the PATCH /shoppingMall/customer/refund-requests endpoint
 * properly accepts different status filter values and returns valid paginated results.
 */
export async function test_api_refund_request_list_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test with status filter 'pending'
  const pendingResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter returns valid pagination",
    pendingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pending filter returns valid data array",
    Array.isArray(pendingResult.data),
  );
  // 3. Test with status filter 'approved'
  const approvedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved filter returns valid pagination",
    approvedResult.pagination.current >= 0,
  );
  // 4. Test with status filter 'rejected'
  const rejectedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected filter returns valid pagination",
    rejectedResult.pagination.current >= 0,
  );
  // 5. Test with status null (no filter - all statuses)
  const allStatusResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: { status: null } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(allStatusResult);
  TestValidator.predicate(
    "null status filter returns valid pagination",
    allStatusResult.pagination.current >= 0,
  );
  // 6. Test with empty body (default behavior)
  const defaultResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default request returns valid pagination",
    defaultResult.pagination.current >= 0,
  );
}
