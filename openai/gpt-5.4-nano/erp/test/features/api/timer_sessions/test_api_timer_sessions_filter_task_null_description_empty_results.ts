import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_sessions_filter_task_null_description_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member via join
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(10)}@${RandomGenerator.alphabets(6)}.test`;
  const password = `${RandomGenerator.alphabets(12)}!Aa9`;
  const memberAuthorized = await authorize_member_join(memberConnectionBase, {
    body: {
      email: email as string & tags.Format<"email">,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: undefined,
    },
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuthorized.token.access;
  // 2) Call timerSessions with taskId=null and non-empty descriptionSearch
  const descriptionSearch = `zz_${RandomGenerator.alphabets(8)}_qq`;
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 5 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const first =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      memberConnection,
      {
        body: {
          taskId: null,
          descriptionSearch,
          isActive: true,
          page,
          limit,
        } satisfies IErpHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(first);
  TestValidator.equals("first page current", first.pagination.current, page);
  TestValidator.equals("first data empty", first.data.length, 0);
  TestValidator.equals("first records", first.pagination.records, 0);
  TestValidator.equals("first pages", first.pagination.pages, 0);
  // 4) Repeat call with taskId=null but without descriptionSearch
  const second =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      memberConnection,
      {
        body: {
          taskId: null,
          isActive: true,
          page,
          limit,
        } satisfies IErpHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(second);
  TestValidator.equals("second page current", second.pagination.current, page);
  for (const row of second.data) {
    TestValidator.equals("second is_active true", row.is_active, true);
    TestValidator.equals("second task is null", row.task, null);
  }
}
