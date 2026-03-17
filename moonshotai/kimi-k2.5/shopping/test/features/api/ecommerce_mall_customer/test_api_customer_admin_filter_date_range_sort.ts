import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_admin_filter_date_range_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test createdAtFrom filter (customers registered on or after)
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const resultFrom = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        createdAtFrom: fromDate.toISOString() as string &
          tags.Format<"date-time">,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(resultFrom);
  // 3. Test createdAtTo filter (customers registered on or before)
  const toDate = new Date();
  const resultTo = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        createdAtTo: toDate.toISOString() as string & tags.Format<"date-time">,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(resultTo);
  // 4. Test combined date range filter (inclusive)
  const resultRange = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        createdAtFrom: fromDate.toISOString() as string &
          tags.Format<"date-time">,
        createdAtTo: toDate.toISOString() as string & tags.Format<"date-time">,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(resultRange);
  // 5. Test sort by email ascending
  const resultSortEmailAsc = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        sort: "email",
        order: "asc",
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(resultSortEmailAsc);
  // 6. Test sort by email descending
  const resultSortEmailDesc =
    await api.functional.ecommerceMall.customers.index(adminConnection, {
      body: {
        sort: "email",
        order: "desc",
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(resultSortEmailDesc);
  // 7. Test sort by createdAt ascending
  const resultSortCreatedAsc =
    await api.functional.ecommerceMall.customers.index(adminConnection, {
      body: {
        sort: "createdAt",
        order: "asc",
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(resultSortCreatedAsc);
  // 8. Test sort by createdAt descending
  const resultSortCreatedDesc =
    await api.functional.ecommerceMall.customers.index(adminConnection, {
      body: {
        sort: "createdAt",
        order: "desc",
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(resultSortCreatedDesc);
  // 9. Test combined date range with sorting preferences
  const resultCombined = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        createdAtFrom: fromDate.toISOString() as string &
          tags.Format<"date-time">,
        createdAtTo: toDate.toISOString() as string & tags.Format<"date-time">,
        sort: "createdAt",
        order: "desc",
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(resultCombined);
}
