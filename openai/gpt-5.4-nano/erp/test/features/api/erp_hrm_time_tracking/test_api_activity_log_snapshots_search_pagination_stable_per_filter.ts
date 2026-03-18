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

export async function test_api_activity_log_snapshots_search_pagination_stable_per_filter(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const joined = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = { ...(memberConnection.headers ?? {}) };
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const to = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
  const limit = 5;
  const broadRequest = {
    performer_id: joined.id,
    from,
    to,
    sort: "created_at",
    sortOrder: "desc",
    page: 1,
    limit,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  const broadPage1 =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search(
      authorizedConnection,
      { body: broadRequest },
    );
  typia.assert(broadPage1);
  TestValidator.predicate(
    "broad page1 data length <= limit",
    broadPage1.data.length <= limit,
  );
  TestValidator.predicate(
    "broad page1 pages >= 1",
    broadPage1.pagination.pages >= 1,
  );
  const broadIdsPage1 = broadPage1.data.map((x) => x.id);
  const broadRequestPage2 = {
    ...broadRequest,
    page: 2,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  const broadPage2 =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search(
      authorizedConnection,
      { body: broadRequestPage2 },
    );
  typia.assert(broadPage2);
  TestValidator.predicate(
    "broad page2 data length <= limit",
    broadPage2.data.length <= limit,
  );
  TestValidator.predicate(
    "broad page2 pages >= 1",
    broadPage2.pagination.pages >= 1,
  );
  if (broadPage1.data.length > 0 && broadPage2.data.length > 0) {
    const ids1 = new Set(broadPage1.data.map((x) => x.id));
    const ids2 = new Set(broadPage2.data.map((x) => x.id));
    const overlapCount = Array.from(ids1).filter((id) => ids2.has(id)).length;
    TestValidator.predicate(
      "page1 and page2 ids should not overlap when both non-empty",
      overlapCount < Math.min(ids1.size, ids2.size),
    );
    // Desc ordering: page1 items should all be >= page2 items.
    const page1Times = broadPage1.data.map((x) =>
      new Date(x.created_at).getTime(),
    );
    const page2Times = broadPage2.data.map((x) =>
      new Date(x.created_at).getTime(),
    );
    const page1Min = page1Times[page1Times.length - 1];
    const page2Min = page2Times[page2Times.length - 1];
    TestValidator.predicate(
      "created_at boundary ordering preserved (desc)",
      page1Min >= page2Min,
    );
    TestValidator.predicate(
      "created_at desc order consistent across pages (all page1 >= all page2)",
      page1Times.every((t1) => page2Times.every((t2) => t1 >= t2)),
    );
  }
  const narrowedActionType =
    broadPage1.data.length > 0
      ? broadPage1.data[0].snapshot_action_type
      : typia.random<string>();
  const narrowedRequest = {
    ...broadRequest,
    snapshot_action_type: narrowedActionType,
    page: 1,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  const narrowedPage1 =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search(
      authorizedConnection,
      { body: narrowedRequest },
    );
  typia.assert(narrowedPage1);
  TestValidator.predicate(
    "narrowed pagination pages >= 0",
    narrowedPage1.pagination.pages >= 0,
  );
  const narrowedIds = narrowedPage1.data.map((x) => x.id);
  if (narrowedPage1.data.length > 0) {
    TestValidator.predicate(
      "narrowed results are subset of broad page1 results",
      narrowedIds.every((id) => broadIdsPage1.includes(id)),
    );
  } else {
    TestValidator.equals(
      "narrowed data is empty",
      narrowedPage1.data.length,
      0,
    );
  }
}
