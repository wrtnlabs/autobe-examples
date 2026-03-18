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

export async function test_api_activity_log_snapshots_search_filter_and_keyword_and_target(
  connection: api.IConnection,
): Promise<void> {
  const baseConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const password = "Password!" + RandomGenerator.alphabets(8);
  const joined = await authorize_member_join(baseConnection, {
    body: {
      email: joinEmail,
      password,
      organizationName: RandomGenerator.name(2),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: joined.token.access,
  };
  const broad =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search(
      memberConnection,
      {
        body: {
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest,
      },
    );
  typia.assert(broad);
  const first = broad.data[0];
  if (!first) {
    TestValidator.equals("broad records=0", broad.pagination.records, 0);
    TestValidator.equals("broad pages=0", broad.pagination.pages, 0);
    TestValidator.equals("broad data empty", broad.data.length, 0);
    return;
  }
  const keywordSource = first.snapshot_action_summary;
  const keyword = RandomGenerator.substring(keywordSource);
  const fromIso = new Date(
    new Date(first.created_at).getTime() - 60 * 1000,
  ).toISOString();
  const toIso = new Date(
    new Date(first.created_at).getTime() + 60 * 1000,
  ).toISOString();
  const narrowed =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search(
      memberConnection,
      {
        body: {
          performer_type: first.performer_type,
          performer_id: first.performer_id,
          target_entity_type: first.target_entity_type,
          target_entity_id: first.target_entity_id,
          snapshot_action_summary_keyword: keyword,
          from: fromIso,
          to: toIso,
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest,
      },
    );
  typia.assert(narrowed);
  if (narrowed.data.length === 0) {
    TestValidator.equals("narrowed records=0", narrowed.pagination.records, 0);
    TestValidator.equals("narrowed pages=0", narrowed.pagination.pages, 0);
    TestValidator.equals("narrowed data empty", narrowed.data.length, 0);
    return;
  }
  for (const snap of narrowed.data) {
    TestValidator.equals(
      "performer_type matches",
      snap.performer_type,
      first.performer_type,
    );
    TestValidator.equals(
      "performer_id matches",
      snap.performer_id,
      first.performer_id,
    );
    TestValidator.equals(
      "target_entity_type matches",
      snap.target_entity_type,
      first.target_entity_type,
    );
    TestValidator.equals(
      "target_entity_id matches",
      snap.target_entity_id,
      first.target_entity_id,
    );
    TestValidator.predicate(
      "keyword substring is in snapshot_action_summary",
      snap.snapshot_action_summary.includes(keyword),
    );
  }
}
