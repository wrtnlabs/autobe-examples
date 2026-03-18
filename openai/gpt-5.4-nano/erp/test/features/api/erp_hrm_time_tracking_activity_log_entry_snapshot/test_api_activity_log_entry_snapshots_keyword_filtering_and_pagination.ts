import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntrySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entry_snapshots_keyword_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const keyword = ("action-" + RandomGenerator.alphabets(6)).toLowerCase();
  // 1) Member join to get authenticated context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers ??= {};
  authConnection.headers.Authorization = authorized.token.access;
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const to = new Date(now.getTime() + 1000 * 60 * 5);
  const req1: IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest = {
    snapshot_action_summary_keyword: keyword,
    from: from.toISOString() satisfies string & tags.Format<"date-time">,
    to: to.toISOString() satisfies string & tags.Format<"date-time">,
    sort: "created_at",
    sortOrder: "desc",
    page: 1,
    limit: 1,
  };
  const page1 =
    await api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.index(
      authConnection,
      { body: req1 },
    );
  typia.assert(page1);
  const { pagination, data } = page1;
  const expectedPages =
    pagination.records === 0 || pagination.limit === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages equals ceil(records/limit)",
    pagination.pages,
    expectedPages,
  );
  for (const item of data) {
    TestValidator.predicate(
      "keyword matches summary",
      item.snapshot_action_summary
        .toLowerCase()
        .includes(keyword.toLowerCase()),
    );
  }
  const canHaveNextPage = pagination.pages > pagination.current;
  if (!canHaveNextPage) return;
  const req2: IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest = {
    ...req1,
    page: (pagination.current + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
  const page2 =
    await api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.index(
      authConnection,
      { body: req2 },
    );
  typia.assert(page2);
  const ids1 = new Set(data.map((x) => x.id));
  for (const item of page2.data) {
    TestValidator.predicate("no duplicates across pages", !ids1.has(item.id));
  }
  TestValidator.predicate(
    "combined size within total",
    data.length + page2.data.length <= pagination.records,
  );
}
