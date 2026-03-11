import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sellers_list_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create new connection with admin token
  const adminListConnection: api.IConnection = { host: connection.host };
  adminListConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Get baseline count without sorting
  const baseline = await api.functional.ecommerceMall.admin.sellers.index(
    adminListConnection,
    {
      body: { limit: 100 } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(baseline);
  const baselineCount = baseline.pagination.records;
  TestValidator.predicate("has records to sort", baselineCount > 0);
  // 3. Test sorting by createdAt (ascending)
  const createdAtAsc = await api.functional.ecommerceMall.admin.sellers.index(
    adminListConnection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: baselineCount,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(createdAtAsc);
  TestValidator.equals(
    "createdAt asc count matches baseline",
    createdAtAsc.pagination.records,
    baselineCount,
  );
  // 4. Test sorting by createdAt (descending)
  const createdAtDesc = await api.functional.ecommerceMall.admin.sellers.index(
    adminListConnection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: baselineCount,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(createdAtDesc);
  TestValidator.equals(
    "createdAt desc count matches baseline",
    createdAtDesc.pagination.records,
    baselineCount,
  );
  // 5. Verify createdAt sorting changes order (asc vs desc should differ)
  const createdAtAscIds = createdAtAsc.data.map((s) => s.id);
  const createdAtDescIds = createdAtDesc.data.map((s) => s.id);
  TestValidator.notEquals(
    "createdAt asc and desc order differs",
    createdAtAscIds.join(","),
    createdAtDescIds.join(","),
  );
  // 6. Test sorting by updatedAt (ascending)
  const updatedAtAsc = await api.functional.ecommerceMall.admin.sellers.index(
    adminListConnection,
    {
      body: {
        sortBy: "updatedAt",
        sortOrder: "asc",
        limit: baselineCount,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(updatedAtAsc);
  TestValidator.equals(
    "updatedAt asc count matches baseline",
    updatedAtAsc.pagination.records,
    baselineCount,
  );
  // 7. Test sorting by updatedAt (descending)
  const updatedAtDesc = await api.functional.ecommerceMall.admin.sellers.index(
    adminListConnection,
    {
      body: {
        sortBy: "updatedAt",
        sortOrder: "desc",
        limit: baselineCount,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(updatedAtDesc);
  TestValidator.equals(
    "updatedAt desc count matches baseline",
    updatedAtDesc.pagination.records,
    baselineCount,
  );
  // 8. Verify updatedAt sorting changes order (asc vs desc should differ)
  const updatedAtAscIds = updatedAtAsc.data.map((s) => s.id);
  const updatedAtDescIds = updatedAtDesc.data.map((s) => s.id);
  TestValidator.notEquals(
    "updatedAt asc and desc order differs",
    updatedAtAscIds.join(","),
    updatedAtDescIds.join(","),
  );
  // 9. Test sorting by email (ascending)
  const emailAsc = await api.functional.ecommerceMall.admin.sellers.index(
    adminListConnection,
    {
      body: {
        sortBy: "email",
        sortOrder: "asc",
        limit: baselineCount,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(emailAsc);
  TestValidator.equals(
    "email asc count matches baseline",
    emailAsc.pagination.records,
    baselineCount,
  );
  // 10. Test sorting by email (descending)
  const emailDesc = await api.functional.ecommerceMall.admin.sellers.index(
    adminListConnection,
    {
      body: {
        sortBy: "email",
        sortOrder: "desc",
        limit: baselineCount,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(emailDesc);
  TestValidator.equals(
    "email desc count matches baseline",
    emailDesc.pagination.records,
    baselineCount,
  );
  // 11. Verify email sorting changes order (asc vs desc should differ)
  const emailAscIds = emailAsc.data.map((s) => s.id);
  const emailDescIds = emailDesc.data.map((s) => s.id);
  TestValidator.notEquals(
    "email asc and desc order differs",
    emailAscIds.join(","),
    emailDescIds.join(","),
  );
}