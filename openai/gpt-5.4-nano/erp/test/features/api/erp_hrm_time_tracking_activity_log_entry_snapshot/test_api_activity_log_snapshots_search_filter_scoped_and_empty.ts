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

export async function test_api_activity_log_snapshots_search_filter_scoped_and_empty(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `P@ss${RandomGenerator.alphabets(10)}!${RandomGenerator.alphabets(2)}`,
      organizationName: RandomGenerator.name(2),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(join);
  const performerId = join.id;
  const performerType = "member";
  const now = new Date();
  const from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const actionType = "time_tracking_review_submitted";
  const searchInputSuccess = {
    snapshot_action_type: actionType,
    performer_type: performerType,
    performer_id: performerId,
    from: from.toISOString(),
    to: to.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  const resA =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search(
      memberConnection,
      {
        body: searchInputSuccess,
      },
    );
  typia.assert(resA);
  TestValidator.equals("pagination current", resA.pagination.current, 1);
  TestValidator.equals("pagination limit", resA.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= data length",
    resA.pagination.records >= resA.data.length,
  );
  if (resA.data.length > 0) {
    for (const item of resA.data) {
      TestValidator.equals(
        "snapshot_action_type matches filter",
        item.snapshot_action_type,
        actionType,
      );
      TestValidator.equals(
        "performer_type matches filter",
        item.performer_type,
        performerType,
      );
      TestValidator.equals(
        "performer_id matches filter",
        item.performer_id,
        performerId,
      );
      const createdAt = new Date(item.created_at).getTime();
      TestValidator.predicate(
        "created_at within [from,to]",
        createdAt >= from.getTime() && createdAt <= to.getTime(),
      );
    }
  }
  const farPastFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const farPastTo = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
  );
  const searchInputEmpty = {
    snapshot_action_type: actionType,
    performer_type: performerType,
    performer_id: performerId,
    from: farPastFrom.toISOString(),
    to: farPastTo.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  const resB =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search(
      memberConnection,
      {
        body: searchInputEmpty,
      },
    );
  typia.assert(resB);
  TestValidator.equals("empty data array", resB.data.length, 0);
  TestValidator.equals("pagination records=0", resB.pagination.records, 0);
  TestValidator.equals("pagination pages=0", resB.pagination.pages, 0);
  TestValidator.equals(
    "pagination current (empty)",
    resB.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit (empty)", resB.pagination.limit, 10);
  const resC =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search(
      memberConnection,
      {
        body: searchInputSuccess,
      },
    );
  typia.assert(resC);
  for (const item of resC.data) {
    TestValidator.equals("scoped performer_id", item.performer_id, performerId);
  }
}
