import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_history_filter_by_refund_request_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using join API
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Prepare to create refund request snapshots for test filtering
  // We need at least one refund request snapshot with known refundRequestId
  // Since no utility function to create refundRequestSnapshot directly, we simulate by calling history with an empty filter to get existing snapshots
  const initialSnapshots =
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.history.index(
      adminConnection,
      { body: { page: 1, limit: 100 } },
    );
  typia.assert(initialSnapshots);
  // Pick a refundRequestId from existing snapshots or create a default UUID
  const refundRequestId =
    initialSnapshots.data.length > 0
      ? initialSnapshots.data[0].refundRequest.id
      : typia.random<string & tags.Format<"uuid">>();
  // 3. Determine createdAt range using current date
  const now = new Date();
  const createdAtStart = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const createdAtEnd = now.toISOString();
  // 4. Filter query using refundRequestId and createdAt range
  const filterBody: IShoppingMallRefundRequestSnapshot.IRequest = {
    refundRequestId,
    createdAtStart,
    createdAtEnd,
    page: 1,
    limit: 50,
  };
  // 5. Call the refund request snapshots history filter endpoint
  const filteredSnapshots =
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.history.index(
      adminConnection,
      { body: filterBody },
    );
  typia.assert(filteredSnapshots);
  // 6. Validate all returned snapshots's refundRequestId matches filter
  for (const snapshot of filteredSnapshots.data) {
    TestValidator.equals(
      "refundRequestId match",
      snapshot.refundRequest.id,
      refundRequestId,
    );
  }
  // 7. Validate all createdAt timestamps in return are within filter date range
  for (const snapshot of filteredSnapshots.data) {
    TestValidator.predicate(
      `createdAt >= ${createdAtStart}`,
      snapshot.createdAt >= createdAtStart,
    );
    TestValidator.predicate(
      `createdAt <= ${createdAtEnd}`,
      snapshot.createdAt <= createdAtEnd,
    );
  }
  // 8. Validate pagination info
  TestValidator.predicate(
    "current page is 1",
    filteredSnapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 50",
    filteredSnapshots.pagination.limit === 50,
  );
  TestValidator.predicate(
    "records count valid",
    filteredSnapshots.pagination.records >= filteredSnapshots.data.length,
  );
  TestValidator.predicate(
    "pages count valid",
    filteredSnapshots.pagination.pages >= 1,
  );
  // 9. Authorization enforcement check
  // Using base connection without token, call should fail with 401 or similar error
  await TestValidator.error(
    "authorization enforcement - unauthorized access",
    async () => {
      await api.functional.shoppingMall.administrator.refundRequestSnapshots.history.index(
        { host: connection.host },
        { body: filterBody },
      );
    },
  );
}
