import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Validate platformAdmin moderation audit log search with time range and action
 * type filters.
 *
 * Business goal: Ensure that a platform administrator authenticated via the
 * admin auth flow can call the moderation analytics audit log search endpoint
 * with combined time-range and action-type filters and receive a correctly
 * paginated summary list. The test relies on existing audit data instead of
 * creating synthetic moderation events, so it must adapt its assertions when
 * the dataset is empty.
 *
 * Flow:
 *
 * 1. Join as a new platformAdmin to obtain an authenticated connection.
 * 2. Perform a broad, mostly unfiltered audit log search to discover existing
 *    moderation audit entries and their action_type values.
 * 3. If entries exist, derive a concrete [from, to] interval and an actionTypes
 *    filter from the returned data.
 * 4. Search again using the derived time range and actionTypes filter and validate
 *    pagination metadata and filter correctness.
 * 5. Optionally, when multiple distinct action_type values exist, perform a second
 *    filtered search with a different actionTypes value and verify that all
 *    returned entries match that action type.
 * 6. If no entries exist in the initial broad search, still verify that the
 *    endpoint responds with structurally valid pagination metadata and an empty
 *    data array.
 */
export async function test_api_moderation_audit_logs_search_by_time_range_and_action_type(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/login",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Perform an initial broad audit log search (no filters, small page size)
  const initialRequest = {
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const initialPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
      connection,
      { body: initialRequest },
    );
  typia.assert(initialPage);

  const initialData = initialPage.data;

  // If there's no data at all, still validate pagination shape and exit early
  if (initialData.length === 0) {
    TestValidator.equals(
      "empty dataset has zero records",
      initialPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty dataset has zero pages",
      initialPage.pagination.pages,
      0,
    );
    TestValidator.equals(
      "requested page is reflected in pagination.current",
      initialPage.pagination.current,
      initialRequest.page ?? 1,
    );
    TestValidator.equals(
      "requested limit is reflected in pagination.limit",
      initialPage.pagination.limit,
      initialRequest.limit ?? 50,
    );
    TestValidator.equals(
      "empty dataset returns empty data array",
      initialData.length,
      0,
    );
    return;
  }

  // 3. Derive [from, to] range and candidate actionTypes from existing data
  let minCreatedAt: Date | null = null;
  let maxCreatedAt: Date | null = null;
  const distinctActionTypes = new Set<string>();

  for (const entry of initialData) {
    const created = new Date(entry.created_at);
    if (minCreatedAt === null || created.getTime() < minCreatedAt.getTime())
      minCreatedAt = created;
    if (maxCreatedAt === null || created.getTime() > maxCreatedAt.getTime())
      maxCreatedAt = created;

    distinctActionTypes.add(entry.action_type);
  }

  // Fallback to now if for some reason dates were unparsable (defensive)
  const now = new Date();
  const fromDate = new Date((minCreatedAt ?? now).getTime() - 5 * 60 * 1000);
  const toDate = new Date((maxCreatedAt ?? now).getTime() + 5 * 60 * 1000);

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const actionTypeArray = Array.from(distinctActionTypes.values());
  const primaryActionType = actionTypeArray[0];

  // 4. Perform filtered search by time range + single action type
  const filteredRequest = {
    page: 1,
    limit: 10,
    from: fromIso,
    to: toIso,
    actionTypes: [primaryActionType],
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const filteredPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
      connection,
      { body: filteredRequest },
    );
  typia.assert(filteredPage);

  const filteredData = filteredPage.data;

  // Validate pagination metadata reflects requested page and limit
  TestValidator.equals(
    "filtered pagination.current equals requested page",
    filteredPage.pagination.current,
    filteredRequest.page ?? 1,
  );
  TestValidator.equals(
    "filtered pagination.limit equals requested limit",
    filteredPage.pagination.limit,
    filteredRequest.limit ?? 10,
  );

  // For every returned summary, check time-range and action_type filter
  for (const entry of filteredData) {
    const created = new Date(entry.created_at);
    TestValidator.predicate(
      "entry created_at is within [from, to] range",
      created.getTime() >= fromDate.getTime() &&
        created.getTime() <= toDate.getTime(),
    );
    TestValidator.equals(
      "entry.action_type matches requested primaryActionType",
      entry.action_type,
      primaryActionType,
    );
  }

  // 6. Optional second call when multiple distinct action types exist
  if (actionTypeArray.length >= 2) {
    const secondaryActionType = actionTypeArray[1];

    const secondaryRequest = {
      page: 1,
      limit: 10,
      from: fromIso,
      to: toIso,
      actionTypes: [secondaryActionType],
    } satisfies ICommunityPlatformModerationAuditLog.IRequest;

    const secondaryPage: IPageICommunityPlatformModerationAuditLog.ISummary =
      await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
        connection,
        { body: secondaryRequest },
      );
    typia.assert(secondaryPage);

    const secondaryData = secondaryPage.data;

    TestValidator.equals(
      "secondary pagination.current equals requested page",
      secondaryPage.pagination.current,
      secondaryRequest.page ?? 1,
    );
    TestValidator.equals(
      "secondary pagination.limit equals requested limit",
      secondaryPage.pagination.limit,
      secondaryRequest.limit ?? 10,
    );

    for (const entry of secondaryData) {
      const created = new Date(entry.created_at);
      TestValidator.predicate(
        "secondary entry created_at is within [from, to] range",
        created.getTime() >= fromDate.getTime() &&
          created.getTime() <= toDate.getTime(),
      );
      TestValidator.equals(
        "secondary entry.action_type matches requested secondaryActionType",
        entry.action_type,
        secondaryActionType,
      );
      TestValidator.notEquals(
        "secondary entry.action_type differs from primaryActionType",
        entry.action_type,
        primaryActionType,
      );
    }
  }
}
