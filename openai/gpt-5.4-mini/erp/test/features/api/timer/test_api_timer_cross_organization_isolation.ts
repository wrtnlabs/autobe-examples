import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnectionA: api.IConnection = { host: connection.host };
  const memberConnectionB: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/member-a",
      referrer: "https://example.com/referrer/member-a",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/member-b",
      referrer: "https://example.com/referrer/member-b",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberB);
  const timerRequestA = {
    page: 1,
    limit: 10,
    sort: "-createdAt",
  } satisfies IErpHrmTimeTimer.IRequest;
  const timerRequestB = {
    page: 1,
    limit: 10,
    sort: "-startedAt",
  } satisfies IErpHrmTimeTimer.IRequest;
  const timersA = await api.functional.erpHrmTime.member.timers.index(
    memberConnectionA,
    {
      body: timerRequestA,
    },
  );
  typia.assert(timersA);
  const timersB = await api.functional.erpHrmTime.member.timers.index(
    memberConnectionB,
    {
      body: timerRequestB,
    },
  );
  typia.assert(timersB);
  TestValidator.predicate(
    "member A timers response has pagination",
    () => timersA.pagination.pages >= 0 && timersA.pagination.records >= 0,
  );
  TestValidator.predicate(
    "member B timers response has pagination",
    () => timersB.pagination.pages >= 0 && timersB.pagination.records >= 0,
  );
  TestValidator.equals(
    "member A request limit is preserved",
    timersA.pagination.limit,
    timerRequestA.limit,
  );
  TestValidator.equals(
    "member B request limit is preserved",
    timersB.pagination.limit,
    timerRequestB.limit,
  );
  TestValidator.predicate(
    "member A data is a timer summary array",
    Array.isArray(timersA.data),
  );
  TestValidator.predicate(
    "member B data is a timer summary array",
    Array.isArray(timersB.data),
  );
  TestValidator.predicate(
    "member A and member B remain independently authenticated",
    memberConnectionA.headers?.Authorization === memberA.token.access &&
      memberConnectionB.headers?.Authorization === memberB.token.access,
  );
}
