import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  // Test basic search without filters - validates pagination structure
  const basicResult =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(basicResult);
  TestValidator.predicate(
    "pagination has valid current page",
    basicResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    basicResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    basicResult.pagination.pages >= 0,
  );
  // Test filtering by status = pending
  const pendingFilter =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingFilter);
  TestValidator.predicate(
    "all items have pending status when filtered",
    pendingFilter.data.every((item) => item.status === "pending"),
  );
  // Test filtering by approved status
  const approvedFilter =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedFilter);
  TestValidator.predicate(
    "all items have approved status when filtered",
    approvedFilter.data.every((item) => item.status === "approved"),
  );
  // Test date range filtering
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredResult =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: startDate.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: endDate.toISOString() as string &
            tags.Format<"date-time">,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
  // Test sorting by createdAt descending
  const sortedDesc =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "results sorted by createdAt descending",
    sortedDesc.data.every((item, index, arr) => {
      if (index === 0) return true;
      return (
        new Date(arr[index - 1].createdAt).getTime() >=
        new Date(item.createdAt).getTime()
      );
    }),
  );
  // Test empty result set with high page number
  const emptyResult =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 99999,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has pages as zero",
    emptyResult.pagination.pages,
    0,
  );
}
