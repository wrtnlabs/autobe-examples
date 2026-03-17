import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering of pending cancellation requests by submission date range.
 *
 * 1. Authenticate as administrator
 * 2. Query pending cancellation requests with date range filter
 * 3. Validate response structure and date filtering
 * 4. Query with date range that returns no results
 * 5. Validate empty results
 */
export async function test_api_admin_cancellation_requests_pending_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16),
      ),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query pending cancellation requests with date range filter
  const now = new Date();
  const oneDayBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const result: IPageIEcommerceMallOrderItemCancellationRequest.ISummary =
    await api.functional.ecommerceMall.admin.cancellation_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          requested_at_from: oneDayBefore.toISOString() satisfies string &
            tags.Format<"date-time">,
          requested_at_to: oneDayAfter.toISOString() satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 100);
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 4. Query with date range that returns no results (future dates)
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const farFutureAfter = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
  const emptyResult: IPageIEcommerceMallOrderItemCancellationRequest.ISummary =
    await api.functional.ecommerceMall.admin.cancellation_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          requested_at_from: farFuture.toISOString() satisfies string &
            tags.Format<"date-time">,
          requested_at_to: farFutureAfter.toISOString() satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 5. Validate empty results
  TestValidator.equals(
    "empty pagination current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals("empty data array length", emptyResult.data.length, 0);
}