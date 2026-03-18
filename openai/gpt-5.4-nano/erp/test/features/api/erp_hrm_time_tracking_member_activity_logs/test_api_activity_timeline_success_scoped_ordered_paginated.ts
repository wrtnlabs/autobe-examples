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

export async function test_api_activity_timeline_success_scoped_ordered_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member (scoped to a single organization/tenant)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/erpHrmTimeTracking/join",
      referrer: "https://example.com/",
      organizationLogoUrl: null,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuth);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { Authorization: memberAuth.token.access };
  // Timeline request (scoped to tenant by auth).
  // NOTE: The provided DTO allows omitting target filters, so we rely on
  // tenant-scoped visibility rather than guessing a concrete target entity.
  const requestBase: IErpHrmTimeTrackingActivityLogEntry.IRequest = {
    limit: 10,
    sortBy: "occurred_at",
    sortOrder: "desc",
    occurredAtFrom: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    occurredAtTo: new Date().toISOString(),
    includeRemovedEntries: false,
    useSnapshots: true,
  };
  const page1 =
    await api.functional.erpHrmTimeTracking.member.activityLogs.targetEntities.timeline.index(
      authConnection,
      {
        body: {
          ...requestBase,
          page: 1,
        },
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 pagination exists",
    page1.pagination !== null && page1.pagination !== undefined,
  );
  TestValidator.predicate("page1 data is array", Array.isArray(page1.data));
  const page1Ids: string[] = [];
  for (const item of page1.data) {
    page1Ids.push(item.id);
    TestValidator.predicate(
      "summary non-empty",
      item.summary.trim().length > 0,
    );
    TestValidator.predicate(
      "details is string or null",
      item.details === null || typeof item.details === "string",
    );
  }
  // Ordering check: occurred_at DESC, then id DESC
  for (let i = 0; i + 1 < page1.data.length; i++) {
    const a = page1.data[i];
    const b = page1.data[i + 1];
    const at = Date.parse(a.occurred_at);
    const bt = Date.parse(b.occurred_at);
    if (at > bt) continue;
    if (at < bt) {
      throw new Error("Ordering violated: occurred_at DESC");
    }
    // occurred_at equal → id DESC (UUID strings should sort consistently)
    if (a.id <= b.id) {
      throw new Error("Ordering violated: id DESC for equal occurred_at");
    }
  }
  TestValidator.predicate(
    "records/pages/limit are consistent",
    page1.pagination.pages ===
      (page1.pagination.records === 0
        ? 0
        : Math.ceil(page1.pagination.records / page1.pagination.limit)),
  );
  TestValidator.equals("current page", page1.pagination.current, 1);
  // Page 2 request with same filters
  const page2 =
    await api.functional.erpHrmTimeTracking.member.activityLogs.targetEntities.timeline.index(
      authConnection,
      {
        body: {
          ...requestBase,
          page: 2,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.predicate("page2 data is array", Array.isArray(page2.data));
  const page2Ids: string[] = page2.data.map((x) => x.id);
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.predicate("no overlap between pages", overlap.length === 0);
  for (const item of page2.data) {
    TestValidator.predicate(
      "page2 summary non-empty",
      item.summary.trim().length > 0,
    );
    TestValidator.predicate(
      "page2 details is string or null",
      item.details === null || typeof item.details === "string",
    );
  }
  TestValidator.equals(
    "total records consistent",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent",
    page2.pagination.pages,
    page1.pagination.pages,
  );
}
