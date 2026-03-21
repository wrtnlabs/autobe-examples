import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_request_snapshots_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Get all snapshots first to establish a date range
  const allSnapshots =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Test with full date range (createdAtFrom and createdAtTo)
  if (allSnapshots.data.length >= 2) {
    const sortedByDate = [...allSnapshots.data].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const fromDate = sortedByDate[0].createdAt;
    const toDate = sortedByDate[sortedByDate.length - 1].createdAt;
    const rangeResult =
      await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
        sellerConnection,
        {
          body: {
            createdAtFrom: fromDate,
            createdAtTo: toDate,
          } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(rangeResult);
    // Validate all returned snapshots are within the date range
    for (const snapshot of rangeResult.data) {
      const snapshotTime = new Date(snapshot.createdAt).getTime();
      const fromTime = new Date(fromDate).getTime();
      const toTime = new Date(toDate).getTime();
      TestValidator.predicate(
        "snapshot createdAt >= createdAtFrom",
        snapshotTime >= fromTime,
      );
      TestValidator.predicate(
        "snapshot createdAt <= createdAtTo",
        snapshotTime <= toTime,
      );
    }
  }
  // 4. Test with only createdAtFrom (no upper bound)
  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fromOnlyResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: thirtyDaysAgo,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(fromOnlyResult);
  // Validate all returned snapshots are created on or after createdAtFrom
  for (const snapshot of fromOnlyResult.data) {
    const snapshotTime = new Date(snapshot.createdAt).getTime();
    const fromTime = new Date(thirtyDaysAgo).getTime();
    TestValidator.predicate(
      "snapshot createdAt >= createdAtFrom (fromOnly)",
      snapshotTime >= fromTime,
    );
  }
  // 5. Test with only createdAtTo (no lower bound)
  const oneYearAgo = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toOnlyResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAtTo: oneYearAgo,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(toOnlyResult);
  // Validate all returned snapshots are created on or before createdAtTo
  for (const snapshot of toOnlyResult.data) {
    const snapshotTime = new Date(snapshot.createdAt).getTime();
    const toTime = new Date(oneYearAgo).getTime();
    TestValidator.predicate(
      "snapshot createdAt <= createdAtTo (toOnly)",
      snapshotTime <= toTime,
    );
  }
}
