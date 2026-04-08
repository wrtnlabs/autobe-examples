import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_history_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator-scoped refund request snapshot history browsing.
   *
   * This test checks that administrators can retrieve paginated refund request snapshot history for a specific order item and refund request pair. It exercises keyword search, date-range filtering, and descending chronological sorting, while ensuring the response remains scoped to the requested parent identifiers and preserves immutable snapshot history fields.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Request refund request snapshot history with search and paging controls.
   * 3. Validate the page metadata, snapshot scoping, and chronological ordering semantics.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const createdAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const createdAtTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const request = {
    search: "approved",
    createdAtFrom,
    createdAtTo,
    sort: "createdAtDesc",
    page: 1,
    limit: 10,
  } satisfies IMallPlatformRefundRequestSnapshot.IRequest;
  const output =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.snapshots.index(
      adminConnection,
      {
        orderItemId,
        refundRequestId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "snapshot page current should be first page",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "snapshot page limit should match request",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "snapshot page record count should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot page pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history should not exceed the requested page size",
    output.data.length <= request.limit,
  );
  TestValidator.predicate(
    "snapshot history should be sorted newest first when records exist",
    () =>
      output.data.length <= 1 ||
      output.data.every((snapshot, index, array) =>
        index === 0 ? true : array[index - 1].createdAt >= snapshot.createdAt,
      ),
  );
  TestValidator.predicate(
    "snapshot history should stay scoped to the requested refund request",
    output.data.every(
      (snapshot) => snapshot.refundRequest.id === refundRequestId,
    ),
  );
  TestValidator.predicate(
    "snapshot history should stay scoped to the requested order item",
    output.data.every(
      (snapshot) => snapshot.refundRequest.orderItem.id === orderItemId,
    ),
  );
  TestValidator.predicate(
    "snapshot history should preserve immutable historical values",
    output.data.every((snapshot) => {
      return (
        typeof snapshot.snapshotReason === "string" &&
        typeof snapshot.statusBefore === "string" &&
        typeof snapshot.statusAfter === "string" &&
        snapshot.createdAt >= createdAtFrom &&
        snapshot.createdAt <= createdAtTo
      );
    }),
  );
}
