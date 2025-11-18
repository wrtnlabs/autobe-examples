import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminNotification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate admin notification search behavior with date range and free-text
 * filters.
 *
 * Business goal: Ensure that PATCH
 * /shoppingMall/admin/adminSearch/adminNotifications correctly applies
 * created_from/created_to filters together with the free-text `search` field
 * for a given administrator, and that pagination metadata stays consistent with
 * the filtered result set.
 *
 * High-level flow:
 *
 * 1. Join an admin via POST /auth/admin/join.
 * 2. Create three notifications for that admin via POST
 *    /shoppingMall/admin/adminNotifications:
 *
 *    - OldNotification: logically "older" notification (we will distinguish by
 *         created_at from search results).
 *    - KeywordNotification: recent notification whose title contains the keyword
 *         "RISK-SLA-BREACH".
 *    - PlainNotification: another recent notification without the keyword.
 * 3. Perform an initial broad search over all notifications for this admin to
 *    discover the concrete created_at timestamps, then compute a date range
 *    that:
 *
 *    - Excludes oldNotification, and
 *    - Includes keywordNotification and plainNotification.
 * 4. Run a search with created_from/created_to narrowed to the recent window and
 *    search set to the keyword. Expect to retrieve exactly
 *    keywordNotification.
 * 5. Run another search with the same date range but search set to null, expecting
 *    to retrieve both keywordNotification and plainNotification and still
 *    exclude oldNotification.
 * 6. Validate pagination metadata and summary integrity.
 */
export async function test_api_admin_notification_search_date_and_text_filters(
  connection: api.IConnection,
) {
  // 1. Onboard an admin and obtain authorized context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: "192.168.0.1",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Create three notifications for that admin
  // oldNotification
  const oldNotificationInput = {
    shopping_mall_admin_id: adminId,
    type: "risk_sla_violation",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "unread",
    priority: "low",
  } satisfies IShoppingMallAdminNotification.ICreate;

  const oldNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: oldNotificationInput },
    );
  typia.assert<IShoppingMallAdminNotification>(oldNotification);

  // keywordNotification (will contain the distinctive keyword in title)
  const keyword = "RISK-SLA-BREACH";
  const keywordNotificationInput = {
    shopping_mall_admin_id: adminId,
    type: "risk_sla_violation",
    title: `${keyword} :: ${RandomGenerator.paragraph({ sentences: 2 })}`,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "unread",
    priority: "high",
  } satisfies IShoppingMallAdminNotification.ICreate;

  const keywordNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: keywordNotificationInput },
    );
  typia.assert<IShoppingMallAdminNotification>(keywordNotification);

  // plainNotification (recent, without keyword)
  const plainNotificationInput = {
    shopping_mall_admin_id: adminId,
    type: "risk_sla_violation",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "unread",
    priority: "normal",
  } satisfies IShoppingMallAdminNotification.ICreate;

  const plainNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: plainNotificationInput },
    );
  typia.assert<IShoppingMallAdminNotification>(plainNotification);

  // 3. Broad search to get real created_at values and derive a recent window
  const broadSearchBody = {
    shopping_mall_admin_id: adminId,
    page: 1,
    limit: 50,
    created_from: null,
    created_to: null,
    search: null,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const broadResult =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      { body: broadSearchBody },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(broadResult);

  const allSummaries = broadResult.data.filter(
    (item) => item.admin.id === adminId,
  );

  // Find corresponding summaries for created notifications by id
  const oldSummaryRaw = allSummaries.find(
    (item) => item.id === oldNotification.id,
  );
  const keywordSummaryRaw = allSummaries.find(
    (item) => item.id === keywordNotification.id,
  );
  const plainSummaryRaw = allSummaries.find(
    (item) => item.id === plainNotification.id,
  );

  TestValidator.predicate(
    "old notification summary must be present in broad search results",
    oldSummaryRaw !== undefined,
  );
  TestValidator.predicate(
    "keyword notification summary must be present in broad search results",
    keywordSummaryRaw !== undefined,
  );
  TestValidator.predicate(
    "plain notification summary must be present in broad search results",
    plainSummaryRaw !== undefined,
  );

  const oldSummary = typia.assert<IShoppingMallAdminNotification.ISummary>(
    oldSummaryRaw!,
  );
  const keywordSummary = typia.assert<IShoppingMallAdminNotification.ISummary>(
    keywordSummaryRaw!,
  );
  const plainSummary = typia.assert<IShoppingMallAdminNotification.ISummary>(
    plainSummaryRaw!,
  );

  // Derive a date range that captures only keywordSummary and plainSummary.
  // We choose created_from = min(created_at of keyword/plain), created_to = max(created_at of keyword/plain).
  const recentCreatedFrom =
    keywordSummary.created_at < plainSummary.created_at
      ? keywordSummary.created_at
      : plainSummary.created_at;
  const recentCreatedTo =
    keywordSummary.created_at > plainSummary.created_at
      ? keywordSummary.created_at
      : plainSummary.created_at;

  // Sanity check: old notification should be outside the recent window
  TestValidator.predicate(
    "old notification created_at should be outside recent date window",
    oldSummary.created_at < recentCreatedFrom ||
      oldSummary.created_at > recentCreatedTo,
  );

  // 4. Search with date range + keyword filter -> expect exactly keywordNotification
  const keywordSearchBody = {
    shopping_mall_admin_id: adminId,
    page: 1,
    limit: 10,
    created_from: recentCreatedFrom,
    created_to: recentCreatedTo,
    search: keyword,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const keywordResult =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      { body: keywordSearchBody },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(keywordResult);

  const keywordItems = keywordResult.data.filter(
    (item) => item.admin.id === adminId,
  );

  TestValidator.equals(
    "keyword search should return exactly one notification for this admin",
    keywordItems.length,
    1,
  );

  const foundKeywordItem = keywordItems[0];
  TestValidator.equals(
    "found keyword notification id must match created keywordNotification",
    foundKeywordItem.id,
    keywordNotification.id,
  );

  TestValidator.predicate(
    "keyword notification created_at within recent date window",
    foundKeywordItem.created_at >= recentCreatedFrom &&
      foundKeywordItem.created_at <= recentCreatedTo,
  );

  TestValidator.predicate(
    "pagination.records should be >= number of data items (keyword search)",
    keywordResult.pagination.records >= keywordItems.length,
  );

  // 5. Search with same date range but no keyword -> expect both recent notifications
  const rangeOnlySearchBody = {
    shopping_mall_admin_id: adminId,
    page: 1,
    limit: 10,
    created_from: recentCreatedFrom,
    created_to: recentCreatedTo,
    search: null,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const rangeOnlyResult =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      { body: rangeOnlySearchBody },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(rangeOnlyResult);

  const rangeItems = rangeOnlyResult.data.filter(
    (item) => item.admin.id === adminId,
  );

  const hasKeyword = rangeItems.some(
    (item) => item.id === keywordNotification.id,
  );
  const hasPlain = rangeItems.some((item) => item.id === plainNotification.id);
  const hasOld = rangeItems.some((item) => item.id === oldNotification.id);

  TestValidator.predicate(
    "range search should contain keywordNotification",
    hasKeyword,
  );
  TestValidator.predicate(
    "range search should contain plainNotification",
    hasPlain,
  );
  TestValidator.predicate(
    "range search should NOT contain oldNotification",
    hasOld === false,
  );

  for (const item of rangeItems) {
    TestValidator.equals(
      "all returned notifications must belong to the joined admin",
      item.admin.id,
      adminId,
    );
    TestValidator.predicate(
      "notification created_at within recent date window in range-only search",
      item.created_at >= recentCreatedFrom &&
        item.created_at <= recentCreatedTo,
    );
  }

  TestValidator.predicate(
    "pagination.current page should be 1 for range-only search",
    rangeOnlyResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit should be >= number of items returned",
    rangeOnlyResult.pagination.limit >= rangeItems.length,
  );
}
