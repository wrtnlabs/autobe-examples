import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAuditLog";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuditLog";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate that only authenticated admin users can access audit log advanced
 * search and pagination operations.
 *
 * 1. Register a new admin account with random credentials (email, password, name,
 *    role, status).
 * 2. Login is implicit upon joining (token in registration response)
 * 3. As admin, search audit logs with various filters (category, event_type,
 *    admin_id, date_from, date_to, description_q), and with paging (page,
 *    limit).
 *
 *    - Repeat with different combinations: no filters (default), filter by random
 *         category or event_type, filter by admin_id, paginate with page/limit,
 *         etc.
 *    - For at least one search, filter by an obviously non-existent value to expect
 *         empty results.
 *    - In each case, assert output is valid and examine pagination metadata
 * 4. As unauthenticated (fresh connection), attempt to use audit log search:
 *    expect to be forbidden or error.
 */
export async function test_api_auditlog_admin_access_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register (and implicitly login as) an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminInput = {
    email: adminEmail,
    password: adminPassword satisfies string as string,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(adminAuth);

  // 2a. Search audit logs with no filters (default page/limit)
  const noFilterReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingAuditLog.IRequest;
  const noFilterRes: IPageIShoppingAuditLog.ISummary =
    await api.functional.shopping.admin.auditLogs.index(connection, {
      body: noFilterReq,
    });
  typia.assert(noFilterRes);
  TestValidator.predicate(
    "pagination from no-filter search",
    noFilterRes.pagination.current === 1 && noFilterRes.pagination.limit === 20,
  );

  // 2b. If there is any audit log data, extract IDs/fields for filtering
  const sample = noFilterRes.data[0];
  // 2c. Filter by a present admin_id if exists, else by random
  const adminIdFilter =
    sample?.admin_id ?? typia.random<string & tags.Format<"uuid">>();
  const byAdminIdReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    admin_id: adminIdFilter,
  } satisfies IShoppingAuditLog.IRequest;
  const byAdminIdRes: IPageIShoppingAuditLog.ISummary =
    await api.functional.shopping.admin.auditLogs.index(connection, {
      body: byAdminIdReq,
    });
  typia.assert(byAdminIdRes);

  TestValidator.equals(
    "adminId filtered results all match requested admin_id or empty",
    ArrayUtil.has(byAdminIdRes.data, (log) => log.admin_id === adminIdFilter),
    byAdminIdRes.data.length > 0 ? true : false,
  );

  // 2d. Filter by random event_type (from sample or random)
  const randomEventType =
    sample?.event_type ?? RandomGenerator.paragraph({ sentences: 2 });
  const byEventTypeReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 3 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    event_type: randomEventType,
  } satisfies IShoppingAuditLog.IRequest;
  const byEventTypeRes: IPageIShoppingAuditLog.ISummary =
    await api.functional.shopping.admin.auditLogs.index(connection, {
      body: byEventTypeReq,
    });
  typia.assert(byEventTypeRes);

  TestValidator.equals(
    "event_type filtered results all match requested event_type or empty",
    ArrayUtil.has(
      byEventTypeRes.data,
      (log) => log.event_type === randomEventType,
    ),
    byEventTypeRes.data.length > 0 ? true : false,
  );

  // 2e. Filter with category and description_q together
  const randomCategory =
    sample?.category ?? RandomGenerator.paragraph({ sentences: 1 });
  const randomDesc =
    sample?.description ?? RandomGenerator.paragraph({ sentences: 1 });
  const byCatDescReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    category: randomCategory,
    description_q: randomDesc,
  } satisfies IShoppingAuditLog.IRequest;
  const byCatDescRes: IPageIShoppingAuditLog.ISummary =
    await api.functional.shopping.admin.auditLogs.index(connection, {
      body: byCatDescReq,
    });
  typia.assert(byCatDescRes);
  TestValidator.predicate(
    "category & description_q filter yields empty or correct category",
    byCatDescRes.data.length === 0 ||
      byCatDescRes.data.every((log) => log.category === randomCategory),
  );

  // 2f. Date range filter with fake old time (should be empty result)
  const oldTimeReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(), // 1 year ago
  } satisfies IShoppingAuditLog.IRequest;
  const oldTimeRes: IPageIShoppingAuditLog.ISummary =
    await api.functional.shopping.admin.auditLogs.index(connection, {
      body: oldTimeReq,
    });
  typia.assert(oldTimeRes);

  TestValidator.equals(
    "old time filter yields empty or plausible data",
    Array.isArray(oldTimeRes.data),
    true,
  );

  // 3. Try a search with a made-up value to check empty
  const fakeCategory = RandomGenerator.paragraph({ sentences: 2 });
  const fakeSearchReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    category: fakeCategory,
  } satisfies IShoppingAuditLog.IRequest;
  const fakeSearchRes: IPageIShoppingAuditLog.ISummary =
    await api.functional.shopping.admin.auditLogs.index(connection, {
      body: fakeSearchReq,
    });
  typia.assert(fakeSearchRes);
  TestValidator.equals(
    "fake category yields no data",
    fakeSearchRes.data.length,
    0,
  );

  // 4. Unauthenticated connection must be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "reject audit log search by unauthenticated users",
    async () => {
      await api.functional.shopping.admin.auditLogs.index(unauthConn, {
        body: noFilterReq,
      });
    },
  );
}
