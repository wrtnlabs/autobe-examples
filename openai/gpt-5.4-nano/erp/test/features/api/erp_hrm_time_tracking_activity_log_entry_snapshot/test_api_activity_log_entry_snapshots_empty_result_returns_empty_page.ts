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

export async function test_api_activity_log_entry_snapshots_empty_result_returns_empty_page(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies {
    email: string & tags.Format<"email">;
    password: string;
  };
  await authorize_member_join(memberConnection, {
    body: {
      email: credentials.email,
      password: credentials.password,
      organizationName: RandomGenerator.name(2),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Query with filters that should match nothing
  const current = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const now = new Date();
  const from = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);
  const to = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 366);
  const keyword = RandomGenerator.alphabets(32);
  const response =
    await api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.index(
      memberConnection,
      {
        body: {
          snapshot_action_summary_keyword: keyword,
          from: from.toISOString(),
          to: to.toISOString(),
          page: current,
          limit: limit,
          sort: "created_at",
          sortOrder: "asc",
        } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("data should be empty", response.data.length, 0);
  TestValidator.equals(
    "pagination.records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination.current should match requested page",
    response.pagination.current,
    1,
  );
}
