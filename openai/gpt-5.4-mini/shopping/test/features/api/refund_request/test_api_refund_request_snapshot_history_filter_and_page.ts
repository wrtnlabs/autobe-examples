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
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_snapshot_history_filter_and_page(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const request = {
    search: RandomGenerator.alphabets(8),
    createdAtFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    sort: "createdAtDesc",
    page: 1,
    limit: 10,
  } satisfies IMallPlatformRefundRequestSnapshot.IRequest;
  const response =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.snapshots.index(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "current page",
    response.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals("limit", response.pagination.limit, request.limit ?? 10);
  TestValidator.predicate(
    "records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", response.pagination.pages >= 0);
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  const expectedPages =
    response.pagination.limit === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals("total pages", response.pagination.pages, expectedPages);
  for (const snapshot of response.data) {
    TestValidator.predicate(
      "createdAt respects lower bound when present",
      request.createdAtFrom === null ||
        snapshot.createdAt >= request.createdAtFrom,
    );
    TestValidator.predicate(
      "createdAt respects upper bound when present",
      request.createdAtTo === null || snapshot.createdAt <= request.createdAtTo,
    );
    TestValidator.predicate(
      "search text matches snapshot fields when present",
      request.search === undefined ||
        [
          snapshot.snapshotReason,
          snapshot.reviewerRole ?? "",
          snapshot.reviewerNote ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(request.search.toLowerCase()),
    );
  }
  for (let index = 1; index < response.data.length; index++) {
    TestValidator.predicate(
      "stable descending order by createdAt",
      response.data[index - 1].createdAt >= response.data[index].createdAt,
    );
  }
}
