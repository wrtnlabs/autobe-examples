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

export async function test_api_timer_filter_and_sort_results(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const requests: IErpHrmTimeTimer.IRequest[] = [
    {
      page: 1,
      limit: 10,
      sort: "startedAt",
    },
    {
      page: 1,
      limit: 10,
      sort: "-startedAt",
    },
    {
      page: 1,
      limit: 10,
      sort: "createdAt",
    },
    {
      page: 1,
      limit: 10,
      sort: "-createdAt",
    },
    {
      search: RandomGenerator.alphabets(3),
      page: 1,
      limit: 5,
    },
    {
      projectId: typia.random<string & tags.Format<"uuid">>(),
      page: 1,
      limit: 5,
    },
    {
      taskId: null,
      page: 1,
      limit: 5,
    },
    {
      isRunning: true,
      page: 1,
      limit: 5,
    },
    {
      startedAtFrom: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      startedAtTo: new Date().toISOString(),
      page: 1,
      limit: 5,
    },
    {
      createdAtFrom: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      createdAtTo: new Date().toISOString(),
      page: 1,
      limit: 5,
    },
  ];
  const responses = await ArrayUtil.asyncMap(requests, async (body) => {
    const output = await api.functional.erpHrmTime.member.timers.index(
      memberConnection,
      {
        body,
      },
    );
    typia.assert(output);
    return output;
  });
  for (const response of responses) {
    typia.assert(response.pagination);
    TestValidator.predicate(
      "pagination current is non-negative",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is non-negative",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "data length does not exceed page limit",
      response.data.length <= response.pagination.limit ||
        response.pagination.limit === 0,
    );
    for (const timer of response.data) {
      typia.assert(timer);
      TestValidator.predicate("timer id is present", timer.id.length > 0);
      TestValidator.predicate(
        "timer startedAt is present",
        timer.startedAt.length > 0,
      );
      TestValidator.predicate(
        "timer createdAt is present",
        timer.createdAt.length > 0,
      );
      TestValidator.predicate(
        "timer updatedAt is present",
        timer.updatedAt.length > 0,
      );
      TestValidator.predicate(
        "timer deletedAt is nullable",
        timer.deletedAt === null || timer.deletedAt.length > 0,
      );
      TestValidator.predicate(
        "timer description is nullable",
        timer.description === null || timer.description.length >= 0,
      );
    }
    const ids = response.data.map((item) => item.id);
    const uniqueIds = new Set(ids);
    TestValidator.equals(
      "timer ids are unique within a page",
      uniqueIds.size,
      ids.length,
    );
  }
  TestValidator.equals(
    "member authorization token stays the same after browsing timers",
    joined.token.access,
    joined.token.access,
  );
}
