import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refund_requests_search_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Browse all refund requests to find a target with searchable reason
  const pageLimit = 100 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const allRequests =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          limit: pageLimit,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // Early exit if no refund requests exist with sufficient reason text
  const targetRequest = allRequests.data.find((r) => r.reason.length > 20);
  if (!targetRequest) {
    return;
  }
  // 3. Extract a random substring from the target reason as search keyword
  const searchKeyword = RandomGenerator.substring(targetRequest.reason);
  // 4. Define a broad date range covering the target request's submission time
  const targetDate = new Date(targetRequest.created_at);
  const createdFrom = new Date(
    targetDate.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const createdTo = new Date(
    targetDate.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // 5. Search with combined keyword + date range
  const searchResult =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          search: searchKeyword,
          created_from: createdFrom,
          created_to: createdTo,
          limit: pageLimit,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // 6. Validate search result count is consistent
  TestValidator.predicate(
    "at least one result matches search",
    searchResult.data.length > 0,
  );
  // 7. Validate all results contain the search keyword (case-insensitive)
  //    and fall within the specified date range
  for (const request of searchResult.data) {
    TestValidator.predicate(
      "reason contains search keyword",
      request.reason.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
    TestValidator.predicate(
      "created_at is within date range",
      new Date(request.created_at) >= new Date(createdFrom) &&
        new Date(request.created_at) <= new Date(createdTo),
    );
  }
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    searchResult.pagination.limit === pageLimit,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= current page data length",
    searchResult.pagination.records >= searchResult.data.length,
  );
}
