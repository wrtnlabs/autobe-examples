import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering of refund requests by pending status.
 *
 * Authenticates as an administrator and retrieves refund requests filtered by the "pending" status. Validates that every returned request is in the pending state with no seller response, confirming the administrator can accurately monitor unresolved refund requests that require attention or potential intervention.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Administrator queries refund requests with status filter set to "pending".
 * 3. Verifies every returned refund request has a status of "pending" and a null responded_at timestamp.
 * 4. Confirms pagination metadata accurately reflects the filtered result set.
 */
export async function test_api_admin_refund_requests_filter_by_pending_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Filter refund requests by pending status
  const result = await api.functional.shoppingMall.admin.refund_requests.index(
    adminConnection,
    {
      body: {
        status: "pending",
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify all returned requests are pending with null responded_at
  for (const request of result.data) {
    TestValidator.equals("status is pending", request.status, "pending");
    TestValidator.equals("responded_at is null", request.responded_at, null);
  }
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "pagination records >= data length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
}
