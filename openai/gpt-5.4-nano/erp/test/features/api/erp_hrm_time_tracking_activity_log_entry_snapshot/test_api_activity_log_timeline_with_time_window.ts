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

export async function test_api_activity_log_timeline_with_time_window(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a new member (join) to establish organization context.
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(32);
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: `https://${RandomGenerator.alphabets(8)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(8)}.example.com/ref`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Request timeline for a concrete (targetEntityType, targetEntityId) within [from, to].
  const targetEntityType = `project:${RandomGenerator.alphabets(6)}`;
  const targetEntityId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const to = new Date(now.getTime() + 1000 * 60 * 5);
  const limit = 10 satisfies number;
  const sort = "created_at" satisfies string;
  const sortOrder = "desc" satisfies "asc" | "desc";
  const baseBody = {
    target_entity_type: targetEntityType,
    target_entity_id: targetEntityId,
    from: from.toISOString() satisfies string & tags.Format<"date-time">,
    to: to.toISOString() satisfies string & tags.Format<"date-time">,
    sort,
    sortOrder,
    limit,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  // Page 1
  const page1 =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.targetEntities.timeline.index(
      memberConnection,
      {
        body: {
          ...baseBody,
          page: 1,
        } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // Validate page1 items.
  for (const item of page1.data) {
    TestValidator.equals(
      "target_entity_type matches",
      item.target_entity_type,
      targetEntityType,
    );
    TestValidator.equals(
      "target_entity_id matches",
      item.target_entity_id,
      targetEntityId,
    );
    const createdAt = new Date(item.created_at).getTime();
    TestValidator.predicate(
      "created_at within [from,to]",
      createdAt >= from.getTime() && createdAt <= to.getTime(),
    );
  }
  // Pagination consistency.
  const { current, limit: respLimit, records, pages } = page1.pagination;
  TestValidator.equals("current is 1", current, 1);
  if (records > 0) {
    const expectedPages = Math.ceil(records / respLimit);
    TestValidator.equals("pages consistent", pages, expectedPages);
  }
  // Ordering check for page1.
  if (page1.data.length >= 2) {
    for (let i = 1; i < page1.data.length; ++i) {
      const prev = new Date(page1.data[i - 1].created_at).getTime();
      const cur = new Date(page1.data[i].created_at).getTime();
      TestValidator.predicate("created_at sorted desc", cur <= prev);
    }
  }
  // Page 2 (stable pagination / no duplicates)
  const page2 =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.targetEntities.timeline.index(
      memberConnection,
      {
        body: {
          ...baseBody,
          page: 2,
        } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest,
      },
    );
  typia.assert(page2);
  const ids1 = new Set(page1.data.map((x) => x.id));
  const duplicated = page2.data.some((x) => ids1.has(x.id));
  TestValidator.predicate(
    "no duplicate snapshot ids across page fetches",
    !duplicated,
  );
  for (const item of page2.data) {
    TestValidator.equals(
      "target_entity_type matches",
      item.target_entity_type,
      targetEntityType,
    );
    TestValidator.equals(
      "target_entity_id matches",
      item.target_entity_id,
      targetEntityId,
    );
    const createdAt = new Date(item.created_at).getTime();
    TestValidator.predicate(
      "created_at within [from,to]",
      createdAt >= from.getTime() && createdAt <= to.getTime(),
    );
  }
}
