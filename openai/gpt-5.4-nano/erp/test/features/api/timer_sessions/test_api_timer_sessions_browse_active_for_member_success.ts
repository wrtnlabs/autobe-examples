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

export async function test_api_timer_sessions_browse_active_for_member_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass!234567",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const employeeId = authorized.id;
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const reqDesc = {
    isActive: true,
    employeeId,
    sortBy: "started_at",
    sortOrder: "desc",
    page,
    limit,
  } satisfies IErpHrmTimeTrackingTimerSession.IRequest;
  const responseDesc =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      memberConnection,
      { body: reqDesc },
    );
  typia.assert(responseDesc);
  TestValidator.equals(
    "pagination current",
    responseDesc.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit",
    responseDesc.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records >= data.length",
    responseDesc.pagination.records >= responseDesc.data.length,
  );
  const expectedPages =
    responseDesc.pagination.records === 0
      ? 0
      : Math.ceil(responseDesc.pagination.records / limit);
  TestValidator.equals(
    "pagination pages",
    responseDesc.pagination.pages,
    expectedPages,
  );
  for (const item of responseDesc.data) {
    TestValidator.equals("item is_active", item.is_active, true);
    TestValidator.equals("item employee id", item.member.id, employeeId);
    TestValidator.equals("ended_at null while active", item.ended_at, null);
  }
  const reqAsc = {
    ...reqDesc,
    sortOrder: "asc",
  } satisfies IErpHrmTimeTrackingTimerSession.IRequest;
  const responseAsc =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      memberConnection,
      { body: reqAsc },
    );
  typia.assert(responseAsc);
  for (const item of responseAsc.data) {
    TestValidator.equals("item is_active", item.is_active, true);
    TestValidator.equals("item employee id", item.member.id, employeeId);
    TestValidator.equals("ended_at null while active", item.ended_at, null);
  }
  if (responseDesc.data.length > 0 && responseAsc.data.length > 0) {
    const firstDesc = responseDesc.data[0].started_at;
    const firstAsc = responseAsc.data[0].started_at;
    TestValidator.notEquals(
      "first item started_at changes with sort",
      firstDesc,
      firstAsc,
    );
    const descStarted = responseDesc.data.map((x) => x.started_at);
    const ascStarted = responseAsc.data.map((x) => x.started_at);
    for (let i = 1; i < descStarted.length; i++) {
      TestValidator.predicate(
        `desc monotonic at ${i}`,
        descStarted[i - 1] >= descStarted[i],
      );
    }
    for (let i = 1; i < ascStarted.length; i++) {
      TestValidator.predicate(
        `asc monotonic at ${i}`,
        ascStarted[i - 1] <= ascStarted[i],
      );
    }
  }
}
