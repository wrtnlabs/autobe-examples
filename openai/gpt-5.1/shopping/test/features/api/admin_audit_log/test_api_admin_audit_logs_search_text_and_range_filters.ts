import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate admin audit log search free-text and created_at range filters.
 *
 * Business goal: Ensure that the administrative audit log search endpoint
 * correctly applies both message-based free-text filtering and created_at time
 * range constraints for authenticated admins, and that pagination metadata is
 * consistent when filters exclude all records.
 *
 * Test steps:
 *
 * 1. Register a new admin via POST /auth/admin/join. This returns
 *    IShoppingMallAdmin.IAuthorized and configures the shared connection with
 *    an Authorization header through the SDK.
 * 2. Perform a broad audit log search using
 *    api.functional.shoppingMall.admin.adminSearch.auditLogs.index with an
 *    IShoppingMallAdminAuditLog.IRequest body that:
 *
 *    - Optionally filters by shopping_mall_admin_id (the new admin ID), but allows
 *         null if logs are global.
 *    - Leaves message and created_at range filters as null to capture a
 *         representative sample of logs.
 *    - Uses explicit page and limit values.
 * 3. If the first page has at least one entry with a non-null message, pick one
 *    such entry as the target sample; otherwise, skip the keyword-based
 *    assertions because we cannot derive a stable keyword.
 * 4. Derive a keyword from the sample entry's message, using the full message
 *    string so that `includes` checks are strict and deterministic.
 * 5. Build a narrow time window around the sample entry's created_at:
 *
 *    - From_created_at: a few minutes before created_at.
 *    - To_created_at: a few minutes after created_at. The window is expressed as ISO
 *         8601 strings.
 * 6. Call auditLogs.index again with an IRequest body that:
 *
 *    - Optionally sets shopping_mall_admin_id to the admin ID (or null).
 *    - Sets message to the derived keyword.
 *    - Sets from_created_at/to_created_at to the computed window.
 *    - Uses page=1 and a sufficiently high limit so all matches fit.
 * 7. Validate the filtered result:
 *
 *    - Typia.assert on the response structure.
 *    - For each entry in data, assert:
 *
 *         - Message is null or a string containing the keyword when message is not null.
 *         - Created_at is between from_created_at and to_created_at (inclusive) when both
 *                   bounds are non-null.
 * 8. Compute a disjoint time range where no keyword-matching logs should appear:
 *
 *    - To_created_at: a time strictly before the earliest created_at of any entry
 *         that matched the keyword in step 7.
 *    - From_created_at: an even earlier time.
 * 9. Call auditLogs.index with the same keyword but the disjoint time range.
 *    Assert that:
 *
 *    - Data.length === 0.
 *    - Pagination.records === 0 (or at least that data is empty to reflect no
 *         matches in the chosen range).
 */
export async function test_api_admin_audit_logs_search_text_and_range_filters(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain authorization context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Perform a broad audit log search to obtain a sample of existing logs
  const broadRequest = {
    shopping_mall_admin_id: null,
    action_type: null,
    entity_type: null,
    entity_id: null,
    request_id: null,
    ip: null,
    user_agent: null,
    message: null,
    from_created_at: null,
    to_created_at: null,
    page: 1,
    limit: 50,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const broadPage: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
      connection,
      {
        body: broadRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(broadPage);

  // If there are no audit logs at all, we can only assert empty baseline
  if (broadPage.data.length === 0) {
    TestValidator.equals(
      "no audit logs present yields empty baseline page",
      broadPage.data.length,
      0,
    );
    TestValidator.equals(
      "no audit logs present yields zero records",
      broadPage.pagination.records,
      0,
    );
    return;
  }

  // 3. Select a sample log entry that has a non-null message
  const sample =
    broadPage.data.find((log) => log.message != null) ?? broadPage.data[0];
  typia.assert<IShoppingMallAdminAuditLog.ISummary>(sample);

  const keyword: string | null = sample.message ?? null;

  // If the sample has no message, we cannot test keyword filtering reliably
  if (keyword === null) {
    TestValidator.equals(
      "sample audit log without message cannot be used for keyword filtering",
      keyword,
      null,
    );
    return;
  }

  // 4. Build a narrow time window around the sample's created_at
  const center = new Date(sample.created_at);
  const fromDate = new Date(center.getTime() - 5 * 60 * 1000);
  const toDate = new Date(center.getTime() + 5 * 60 * 1000);
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // 5. Query again using message keyword and narrow time window
  const filteredRequest = {
    shopping_mall_admin_id: sample.shopping_mall_admin_id ?? null,
    action_type: null,
    entity_type: null,
    entity_id: null,
    request_id: null,
    ip: null,
    user_agent: null,
    message: keyword,
    from_created_at: fromIso as string & tags.Format<"date-time">,
    to_created_at: toIso as string & tags.Format<"date-time">,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const filteredPage: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
      connection,
      {
        body: filteredRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(filteredPage);

  // 6. Validate that all returned entries respect keyword and time range
  for (const log of filteredPage.data) {
    typia.assert<IShoppingMallAdminAuditLog.ISummary>(log);

    // created_at must fall within [fromIso, toIso]
    const createdAt = new Date(log.created_at).getTime();
    const fromMillis = fromDate.getTime();
    const toMillis = toDate.getTime();

    TestValidator.predicate(
      "audit log created_at within requested time window",
      createdAt >= fromMillis && createdAt <= toMillis,
    );

    // message must contain the keyword substring when not null
    if (log.message != null) {
      TestValidator.predicate(
        "audit log message contains keyword",
        log.message.includes(keyword),
      );
    }
  }

  // 7. If we have at least one result, compute a disjoint earlier time range
  if (filteredPage.data.length > 0) {
    const earliest = filteredPage.data.reduce((min, log) => {
      const t = new Date(log.created_at).getTime();
      return t < min ? t : min;
    }, new Date(filteredPage.data[0].created_at).getTime());

    const beforeTo = new Date(earliest - 60 * 60 * 1000); // 1 hour before
    const beforeFrom = new Date(beforeTo.getTime() - 60 * 60 * 1000); // 2h window

    const beforeFromIso = beforeFrom.toISOString();
    const beforeToIso = beforeTo.toISOString();

    const emptyRangeRequest = {
      shopping_mall_admin_id: sample.shopping_mall_admin_id ?? null,
      action_type: null,
      entity_type: null,
      entity_id: null,
      request_id: null,
      ip: null,
      user_agent: null,
      message: keyword,
      from_created_at: beforeFromIso as string & tags.Format<"date-time">,
      to_created_at: beforeToIso as string & tags.Format<"date-time">,
      page: 1,
      limit: 100,
    } satisfies IShoppingMallAdminAuditLog.IRequest;

    const emptyRangePage: IPageIShoppingMallAdminAuditLog.ISummary =
      await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
        connection,
        {
          body: emptyRangeRequest,
        },
      );
    typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(emptyRangePage);

    TestValidator.equals(
      "disjoint time window yields no keyword-matching audit logs",
      emptyRangePage.data.length,
      0,
    );

    TestValidator.equals(
      "disjoint time window yields zero pagination.records for keyword",
      emptyRangePage.pagination.records,
      0,
    );
  }
}
