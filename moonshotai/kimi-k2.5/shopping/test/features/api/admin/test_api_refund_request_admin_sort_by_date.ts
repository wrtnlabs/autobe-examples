import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_admin_sort_by_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Search refund requests without specific sorting (default order)
  const defaultResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(defaultResult);
  // 3. Search with pagination parameters
  const paginatedResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // 4. Search with status filter
  const pendingResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 5. Search with date range filter
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          requestedAtFrom: yesterday.toISOString(),
          requestedAtTo: today.toISOString(),
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 6. Combined search with filter and pagination
  const combinedResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 5,
          requestedAtFrom: yesterday.toISOString(),
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
}
