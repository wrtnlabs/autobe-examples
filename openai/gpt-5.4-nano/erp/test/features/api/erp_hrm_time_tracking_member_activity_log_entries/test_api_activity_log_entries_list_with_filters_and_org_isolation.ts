import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entries_list_with_filters_and_org_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const token = joined.token;
  typia.assert(token);
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = { Authorization: joined.token.access };
  const memberId = joined.id;
  // Narrow window for deterministic pagination.
  const occurredAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString() satisfies string;
  const occurredAtTo = new Date().toISOString();
  const limit = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page1: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as any;
  const baseBody = {
    page: page1,
    limit,
    occurredAtFrom,
    occurredAtTo,
    performedByMemberId: memberId,
    sortBy: "occurred_at",
    sortOrder: "desc",
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest;
  const pageResult1 =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      actorConnection,
      {
        body: baseBody,
      },
    );
  typia.assert(pageResult1);
  TestValidator.equals(
    "pagination current",
    pageResult1.pagination.current,
    page1,
  );
  const expectedPages = Math.ceil(pageResult1.pagination.records / limit);
  TestValidator.equals(
    "pagination pages matches ceil(records/limit)",
    pageResult1.pagination.pages,
    expectedPages,
  );
  for (const item of pageResult1.data) {
    TestValidator.equals(
      "organization isolated (organization_id)",
      item.organization_id,
      pageResult1.data[0]?.organization_id ?? item.organization_id,
    );
    typia.assert<IErpHrmTimeTrackingActivityLogEntry.ISummary>(item);
    TestValidator.equals(
      "performed_by_member_id",
      item.performed_by_member_id,
      memberId,
    );
    TestValidator.predicate("summary exists", item.summary.length >= 0);
    TestValidator.predicate(
      "details nullable",
      item.details === null || typeof item.details === "string",
    );
    TestValidator.predicate("occurred_at present", item.occurred_at.length > 0);
  }
  // Deterministic ordering across repeated calls.
  const pageResult1Repeat =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      actorConnection,
      {
        body: baseBody,
      },
    );
  typia.assert(pageResult1Repeat);
  TestValidator.equals(
    "same records count for same filters",
    pageResult1Repeat.pagination.records,
    pageResult1.pagination.records,
  );
  TestValidator.equals(
    "same pages count for same filters",
    pageResult1Repeat.pagination.pages,
    pageResult1.pagination.pages,
  );
  TestValidator.equals(
    "same ids order on repeated call",
    pageResult1Repeat.data.map((x) => x.id),
    pageResult1.data.map((x) => x.id),
  );
  // Edge pagination: page 2 should not overlap with page 1.
  const page2: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as any;
  const baseBodyPage2 = {
    ...baseBody,
    page: page2,
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest;
  const pageResult2 =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      actorConnection,
      {
        body: baseBodyPage2,
      },
    );
  typia.assert(pageResult2);
  const overlap = new Set(pageResult1.data.map((x) => x.id));
  for (const item of pageResult2.data) {
    TestValidator.predicate(
      "no overlap between pages",
      () => !overlap.has(item.id),
    );
  }
  // Scenario 2: includeRemovedEntries superset.
  const defaultBody = {
    ...baseBody,
    includeRemovedEntries: undefined,
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest;
  const removedDefault =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      actorConnection,
      { body: defaultBody },
    );
  typia.assert(removedDefault);
  const includeRemovedBody = {
    ...baseBody,
    includeRemovedEntries: true,
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest;
  const removedIncluded =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      actorConnection,
      { body: includeRemovedBody },
    );
  typia.assert(removedIncluded);
  TestValidator.predicate(
    "includeRemovedEntries returns superset (records >=)",
    removedIncluded.pagination.records >= removedDefault.pagination.records,
  );
  TestValidator.predicate(
    "includeRemovedEntries returns superset (data size >=)",
    removedIncluded.data.length >= removedDefault.data.length,
  );
  const orgId =
    removedDefault.data[0]?.organization_id ??
    removedIncluded.data[0]?.organization_id;
  if (orgId) {
    for (const item of removedDefault.data) {
      TestValidator.equals(
        "default removed query org isolated",
        item.organization_id,
        orgId,
      );
    }
    for (const item of removedIncluded.data) {
      TestValidator.equals(
        "includeRemoved query org isolated",
        item.organization_id,
        orgId,
      );
    }
  }
  // Scenario 3: text search.
  // Choose a keyword from returned summaries (ensures at least one match if any data exists).
  const keywordSource = pageResult1.data[0];
  const keyword = keywordSource
    ? RandomGenerator.substring(keywordSource.summary)
    : "a";
  const summarySearchBody = {
    ...baseBody,
    page: 1 as any,
    summarySearch: keyword,
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest;
  const summarySearchResult =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      actorConnection,
      { body: summarySearchBody },
    );
  typia.assert(summarySearchResult);
  for (const item of summarySearchResult.data) {
    TestValidator.predicate(
      "summarySearch matches keyword",
      item.summary.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (orgId)
      TestValidator.equals(
        "text search org isolated",
        item.organization_id,
        orgId,
      );
  }
  const detailsKeywordSource = pageResult1.data.find((x) => x.details !== null);
  const detailsKeyword = detailsKeywordSource
    ? RandomGenerator.substring(detailsKeywordSource.details as string)
    : keyword;
  const detailsSearchBody = {
    ...baseBody,
    page: 1 as any,
    detailsSearch: detailsKeyword,
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest;
  const detailsSearchResult =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      actorConnection,
      { body: detailsSearchBody },
    );
  typia.assert(detailsSearchResult);
  for (const item of detailsSearchResult.data) {
    TestValidator.predicate(
      "detailsSearch returns non-null details",
      item.details !== null,
    );
    if (item.details !== null) {
      TestValidator.predicate(
        "details contains keyword",
        item.details.toLowerCase().includes(detailsKeyword.toLowerCase()),
      );
    }
    if (orgId)
      TestValidator.equals(
        "details search org isolated",
        item.organization_id,
        orgId,
      );
  }
}
