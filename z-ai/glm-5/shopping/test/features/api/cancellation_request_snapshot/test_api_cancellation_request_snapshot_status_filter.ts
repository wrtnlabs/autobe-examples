import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
 * Test customer filtering of cancellation request snapshots by status.
 *
 * This test validates that:
 * 1. Status filter 'approved' returns only approved snapshots
 * 2. Status filter 'rejected' returns only rejected snapshots
 * 3. Each snapshot in filtered results has the correct status
 * 4. Pagination works with status filters
 * 5. Response structure is consistent
 */
export async function test_api_cancellation_request_snapshot_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Query snapshots with 'approved' status filter
  const approvedSnapshots =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Validate all returned snapshots have 'approved' status
  TestValidator.predicate(
    "all approved snapshots have approved status",
    approvedSnapshots.data.every((snapshot) => snapshot.status === "approved"),
  );
  // 3. Query snapshots with 'rejected' status filter
  const rejectedSnapshots =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Validate all returned snapshots have 'rejected' status
  TestValidator.predicate(
    "all rejected snapshots have rejected status",
    rejectedSnapshots.data.every((snapshot) => snapshot.status === "rejected"),
  );
  // 4. Query all snapshots without status filter
  const allSnapshots =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 5. Validate pagination structure
  TestValidator.predicate(
    "approved pagination has valid structure",
    approvedSnapshots.pagination.current >= 0 &&
      approvedSnapshots.pagination.limit >= 0 &&
      approvedSnapshots.pagination.records >= 0 &&
      approvedSnapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "rejected pagination has valid structure",
    rejectedSnapshots.pagination.current >= 0 &&
      rejectedSnapshots.pagination.limit >= 0 &&
      rejectedSnapshots.pagination.records >= 0 &&
      rejectedSnapshots.pagination.pages >= 0,
  );
  // 6. Validate no overlap between approved and rejected results
  const approvedIds = new Set(approvedSnapshots.data.map((s) => s.id));
  const rejectedIds = new Set(rejectedSnapshots.data.map((s) => s.id));
  const hasOverlap = [...approvedIds].some((id) => rejectedIds.has(id));
  TestValidator.predicate(
    "no overlap between approved and rejected snapshots",
    !hasOverlap,
  );
}
