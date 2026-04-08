import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_cancellation_request_snapshots_pagination_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Test default pagination (limit 20)
  const defaultPage: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page limit should be 20",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page current should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default page has records >= 0",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default page has pages >= 0",
    defaultPage.pagination.pages >= 0,
  );
  // 3. Test custom pagination (limit 10)
  const customPage10: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(customPage10);
  TestValidator.equals(
    "custom page limit should be 10",
    customPage10.pagination.limit,
    10,
  );
  // 4. Test custom pagination (limit 50)
  const customPage50: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 50,
          page: 1,
        },
      },
    );
  typia.assert(customPage50);
  TestValidator.equals(
    "custom page limit should be 50",
    customPage50.pagination.limit,
    50,
  );
  // 5. Test cursor-based pagination
  if (defaultPage.data.length > 0) {
    const lastItem = defaultPage.data[defaultPage.data.length - 1];
    const cursorString = `${lastItem.created_at}:${lastItem.id}`;
    const cursorPage: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
      await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
        sellerConnection,
        {
          body: {
            limit: 10,
            cursor: cursorString,
          },
        },
      );
    typia.assert(cursorPage);
    TestValidator.equals(
      "cursor page should have current 1",
      cursorPage.pagination.current,
      1,
    );
  }
  // 6. Test date range filtering with created_at_range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const dateRangeFilter: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          created_at_range: {
            gte: twoDaysAgo.toISOString(),
            lte: now.toISOString(),
          },
        },
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.equals(
    "date range filter page limit should be 20",
    dateRangeFilter.pagination.limit,
    20,
  );
  // 7. Validate snapshots returned are within date range
  for (const snapshot of dateRangeFilter.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot created_at >= gte boundary`,
      snapshotDate >= new Date(twoDaysAgo.toISOString()),
    );
    TestValidator.predicate(
      `snapshot created_at <= lte boundary`,
      snapshotDate <= now,
    );
  }
  // 8. Test approved_at_range filtering
  const approvedRangeFilter: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          approved_at_range: {
            gte: oneDayAgo.toISOString(),
            lte: now.toISOString(),
          },
        },
      },
    );
  typia.assert(approvedRangeFilter);
  TestValidator.equals(
    "approved at range filter page limit should be 20",
    approvedRangeFilter.pagination.limit,
    20,
  );
  // 9. Test rejected_at_range filtering
  const rejectedRangeFilter: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          rejected_at_range: {
            gte: oneDayAgo.toISOString(),
            lte: now.toISOString(),
          },
        },
      },
    );
  typia.assert(rejectedRangeFilter);
  TestValidator.equals(
    "rejected at range filter page limit should be 20",
    rejectedRangeFilter.pagination.limit,
    20,
  );
  // 10. Test minimum limit (1)
  const minLimitPage: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals(
    "minimum limit page should have limit 1",
    minLimitPage.pagination.limit,
    1,
  );
  // 11. Test maximum limit (100)
  const maxLimitPage: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 100,
          page: 1,
        },
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "maximum limit page should have limit 100",
    maxLimitPage.pagination.limit,
    100,
  );
  // 12. Test pagination metadata consistency
  if (defaultPage.pagination.records > 0 && defaultPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      defaultPage.pagination.records / defaultPage.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation should be correct",
      defaultPage.pagination.pages,
      expectedPages,
    );
  }
  // 13. Test multiple pages
  if (defaultPage.pagination.pages > 1) {
    const page2: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
      await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
        sellerConnection,
        {
          body: {
            limit: 20,
            page: 2,
          },
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 current should be 2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit should be 20",
      page2.pagination.limit,
      20,
    );
  }
}