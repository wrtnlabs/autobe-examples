import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallApiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallApiLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallApiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallApiLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_api_logs_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Authenticate admin user
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminUser.token.access, // use token as email placeholder
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 3. Fetch first page of API logs
  const firstPage = await api.functional.ecommerceMall.admin.api_logs.index(
    adminConnection,
    {
      body: {
        limit: 50,
      },
    },
  );
  typia.assert(firstPage);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "first page records count",
    firstPage.pagination.records,
    firstPage.data.length,
  );
  TestValidator.predicate(
    "has valid pages count",
    firstPage.pagination.pages >= 0,
  );
  // 5. Request next page using cursor from last item
  const lastId =
    firstPage.data.length > 0
      ? firstPage.data[firstPage.data.length - 1].id
      : undefined;
  const secondPage = await api.functional.ecommerceMall.admin.api_logs.index(
    adminConnection,
    {
      body: {
        page: lastId ? { cursor: lastId, limit: 50 } : undefined,
      },
    },
  );
  typia.assert(secondPage);
  // 6. Verify no overlap between pages
  if (secondPage.data.length > 0 && firstPage.data.length > 0) {
    const firstPageIds = firstPage.data.map((item) => item.id);
    const secondPageIds = secondPage.data.map((item) => item.id);
    TestValidator.predicate(
      "no overlap between pages",
      !firstPageIds.some((id) => secondPageIds.includes(id)),
    );
  }
  // 7. Test cursor-based pagination with direction='asc' (oldest first)
  const ascendingPage = await api.functional.ecommerceMall.admin.api_logs.index(
    adminConnection,
    {
      body: {
        limit: 50,
      },
    },
  );
  typia.assert(ascendingPage);
  // 8. Verify chronological ordering
  if (ascendingPage.data.length >= 2) {
    const timestamps = ascendingPage.data.map((item) =>
      new Date(item.created_at).getTime(),
    );
    TestValidator.predicate(
      "chronologically ordered",
      timestamps.every((ts, i) => i === 0 || timestamps[i - 1] <= ts),
    );
  }
}
