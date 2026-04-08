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

export async function test_api_timer_browse_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const browsingConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const request: IErpHrmTimeTimer.IRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphabets(3),
    sort: "-createdAt",
  };
  const output = await api.functional.erpHrmTime.member.timers.index(
    browsingConnection,
    { body: request },
  );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "response data size does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  for (const timer of output.data) {
    typia.assert(timer);
    TestValidator.predicate("timer id exists", timer.id.length > 0);
    TestValidator.predicate(
      "timer startedAt exists",
      timer.startedAt.length > 0,
    );
    TestValidator.predicate(
      "timer createdAt exists",
      timer.createdAt.length > 0,
    );
    TestValidator.predicate(
      "timer updatedAt exists",
      timer.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "timer deletedAt is nullable timestamp",
      timer.deletedAt === null || timer.deletedAt.length > 0,
    );
  }
  await TestValidator.httpError(
    "missing authorization should be rejected",
    [401, 403],
    async () =>
      api.functional.erpHrmTime.member.timers.index(
        { host: connection.host },
        { body: request },
      ),
  );
}
