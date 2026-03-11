import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_dispute_investigation_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Fetch all snapshots with pagination to establish baseline
  const page1 =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    page1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is valid",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    page1.pagination.pages >= 0,
  );
  // 4. If there are snapshots, test filtering by specific cancellation request ID
  if (page1.data.length > 0) {
    const targetCancellationRequestId = page1.data[0].cancellationRequest.id;
    // Filter by specific cancellation request ID
    const filteredPage =
      await api.functional.shoppingMall.administrator.cancellation_request_snapshots.index(
        adminConnection,
        {
          body: {
            shopping_mall_cancellation_request_id: targetCancellationRequestId,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(filteredPage);
    // Validate all returned snapshots belong to the filtered cancellation request
    for (const snapshot of filteredPage.data) {
      TestValidator.equals(
        "snapshot cancellation request matches filter",
        snapshot.cancellationRequest.id,
        targetCancellationRequestId,
      );
    }
    // Validate snapshot structure contains required fields
    if (filteredPage.data.length > 0) {
      const snapshot = filteredPage.data[0];
      TestValidator.predicate(
        "snapshot has reason text",
        snapshot.reason.length > 0,
      );
      TestValidator.predicate(
        "snapshot has valid status",
        snapshot.status === "approved" || snapshot.status === "rejected",
      );
    }
  }
}
