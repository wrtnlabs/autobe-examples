import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshots_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create new connection with seller token
  const sellerAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  // 3. Query with newStatus='cancelled' filter
  const cancelledSnapshots =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerAuthorizedConnection,
      {
        body: {
          newStatus: "cancelled",
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(cancelledSnapshots);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "cancelled snapshots pagination current",
    cancelledSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "cancelled snapshots pagination records",
    cancelledSnapshots.pagination.records,
    0,
  );
  // 5. Query with oldStatus='paid' and newStatus='cancelled' combined filter
  const paidToCancelledSnapshots =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerAuthorizedConnection,
      {
        body: {
          oldStatus: "paid",
          newStatus: "cancelled",
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(paidToCancelledSnapshots);
  // 6. Validate combined filter pagination metadata
  TestValidator.equals(
    "paid to cancelled snapshots pagination current",
    paidToCancelledSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "paid to cancelled snapshots pagination records",
    paidToCancelledSnapshots.pagination.records,
    0,
  );
  // 7. Query with oldStatus='paid' and newStatus='paid' (rejected cancellation)
  const paidToPaidSnapshots =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerAuthorizedConnection,
      {
        body: {
          oldStatus: "paid",
          newStatus: "paid",
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(paidToPaidSnapshots);
  // 8. Validate rejected cancellation filter metadata
  TestValidator.equals(
    "paid to paid snapshots pagination current",
    paidToPaidSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "paid to paid snapshots pagination records",
    paidToPaidSnapshots.pagination.records,
    0,
  );
  // 9. Test valid enum but non-matching combination (empty results)
  const noMatchSnapshots =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerAuthorizedConnection,
      {
        body: {
          oldStatus: "delivered",
          newStatus: "cancelled",
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(noMatchSnapshots);
  TestValidator.equals(
    "no match snapshots pagination records",
    noMatchSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match snapshots pages",
    noMatchSnapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no match snapshots data is array",
    noMatchSnapshots.data.length,
    0,
  );
  // 10. Test all valid enum values individually for newStatus
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  for (const status of validStatuses) {
    const statusSnapshots =
      await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
        sellerAuthorizedConnection,
        {
          body: {
            newStatus: status,
            page: 1,
            pageSize: 20,
          } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
        },
      );
    typia.assert(statusSnapshots);
    TestValidator.equals(
      `valid newStatus ${status} pagination current`,
      statusSnapshots.pagination.current,
      1,
    );
  }
  // 11. Test all valid oldStatus enum values
  for (const status of validStatuses) {
    const oldStatusSnapshots =
      await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
        sellerAuthorizedConnection,
        {
          body: {
            oldStatus: status,
            page: 1,
            pageSize: 20,
          } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
        },
      );
    typia.assert(oldStatusSnapshots);
    TestValidator.equals(
      `valid oldStatus ${status} pagination current`,
      oldStatusSnapshots.pagination.current,
      1,
    );
  }
}
