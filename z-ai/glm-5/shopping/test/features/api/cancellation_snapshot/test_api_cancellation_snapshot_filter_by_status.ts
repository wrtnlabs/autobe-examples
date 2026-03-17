import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test filtering cancellation request snapshots by status.
 *
 * This test verifies that customers can filter snapshots by 'approved' or 'rejected'
 * status to focus on specific types of seller responses for dispute resolution.
 */
export async function test_api_cancellation_snapshot_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test filtering by 'approved' status
  const approvedResult =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify all returned snapshots have 'approved' status
  for (const snapshot of approvedResult.data) {
    TestValidator.equals(
      "approved snapshot status",
      snapshot.status,
      "approved",
    );
  }
  // 3. Test filtering by 'rejected' status
  const rejectedResult =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify all returned snapshots have 'rejected' status
  for (const snapshot of rejectedResult.data) {
    TestValidator.equals(
      "rejected snapshot status",
      snapshot.status,
      "rejected",
    );
  }
  // 4. Test without status filter
  const allResult =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allResult);
  // Verify pagination structure is valid
  TestValidator.predicate(
    "pagination has valid structure",
    allResult.pagination.current >= 0 &&
      allResult.pagination.limit >= 0 &&
      allResult.pagination.records >= 0 &&
      allResult.pagination.pages >= 0,
  );
}
