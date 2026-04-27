import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Filter by a single status — "pending"
  const pendingPage =
    await api.functional.eCommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.equals(
    "all items have pending status",
    pendingPage.data.every((r) => r.status === "pending"),
    true,
  );
  TestValidator.equals("empty page for new seller", pendingPage.data.length, 0);
  // 3. Filter by multiple statuses
  const multiStatusPage =
    await api.functional.eCommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: ["pending", "approved"] as (
            | "pending"
            | "approved"
            | "rejected"
          )[] &
            tags.UniqueItems,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(multiStatusPage);
  TestValidator.equals(
    "multi status returns empty for new seller",
    multiStatusPage.data.length,
    0,
  );
  // 4. Pagination works with status filter
  const paginatedPage =
    await api.functional.eCommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals(
    "current page is 1",
    paginatedPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", paginatedPage.pagination.limit, 10);
  TestValidator.equals("records is 0", paginatedPage.pagination.records, 0);
  TestValidator.equals("pages is 0", paginatedPage.pagination.pages, 0);
}
