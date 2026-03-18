import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  const reviewAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    search: RandomGenerator.alphabets(3),
    page: 1,
    limit: 1,
    sort: "createdAt",
    order: "asc",
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const firstPage =
    await api.functional.shoppingMall.administrator.order_items.refund_request.snapshots.index(
      reviewAdminConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    firstPage.pagination.limit,
    request.limit ?? firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed page size",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  if (firstPage.data.length > 0) {
    const chronological = [...firstPage.data].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    TestValidator.equals(
      "ascending snapshot chronology",
      firstPage.data.map((snapshot) => snapshot.createdAt),
      chronological.map((snapshot) => snapshot.createdAt),
    );
    const snapshot = firstPage.data[0];
    typia.assert(snapshot.refundRequest);
    TestValidator.predicate(
      "snapshot preserves reason text",
      snapshot.reason.length > 0,
    );
    TestValidator.predicate(
      "snapshot preserves status text",
      snapshot.status.length > 0,
    );
    TestValidator.predicate(
      "snapshot preserves createdAt timestamp",
      snapshot.createdAt.length > 0,
    );
  }
  const outOfRange =
    await api.functional.shoppingMall.administrator.order_items.refund_request.snapshots.index(
      reviewAdminConnection,
      {
        orderItemId,
        body: {
          ...request,
          page: firstPage.pagination.pages + 1,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(outOfRange);
  TestValidator.equals(
    "out-of-range page number is preserved",
    outOfRange.pagination.current,
    firstPage.pagination.pages + 1,
  );
  TestValidator.predicate(
    "out-of-range page respects page size semantics",
    outOfRange.data.length <= outOfRange.pagination.limit,
  );
  TestValidator.equals(
    "live snapshot record count remains unchanged",
    outOfRange.pagination.records,
    firstPage.pagination.records,
  );
}
