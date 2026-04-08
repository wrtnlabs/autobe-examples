import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_admin_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random orderItemId for testing
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test filtering by pending status
  const pendingResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate("pending filter returns valid page", () => {
    return (
      pendingResult.pagination.limit > 0 &&
      pendingResult.pagination.current >= 0
    );
  });
  // 4. Test filtering by approved status
  const approvedResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // 5. Test filtering by rejected status
  const rejectedResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // 6. Test filtering by created_at date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAtResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          createdAtFrom: oneWeekAgo.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(createdAtResult);
  // 7. Test filtering by responded_at date range (only applies to non-pending)
  const respondedAtResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          respondedAtFrom: oneWeekAgo.toISOString(),
          respondedAtTo: now.toISOString(),
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(respondedAtResult);
  // 8. Test combining multiple filters (status + date range)
  const combinedFiltersResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          status: "pending",
          createdAtFrom: oneWeekAgo.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedFiltersResult);
  // 9. Test sorting by created_at ascending
  const sortCreatedAtAscResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortCreatedAtAscResult);
  // 10. Test sorting by created_at descending
  const sortCreatedAtDescResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortCreatedAtDescResult);
  // 11. Test sorting with pagination
  const paginatedResult =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit matches",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
}
