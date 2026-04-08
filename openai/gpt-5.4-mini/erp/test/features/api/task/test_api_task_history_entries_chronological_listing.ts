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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_history_entries_chronological_listing(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(12)}@example.com` as string &
        tags.Format<"email">,
      password: `Password${RandomGenerator.alphaNumeric(8)}!` as string &
        tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    pageSize: 10,
    limit: 10,
  } satisfies IErpHrmTimeTaskHistoryEntry.IRequest;
  const first =
    await api.functional.erpHrmTime.member.projects.tasks.historyEntries.index(
      memberConnection,
      {
        projectId,
        taskId,
        body,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "history page current",
    first.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "history page limit",
    first.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "history page records non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "history page pages non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "history data is an array",
    Array.isArray(first.data),
  );
  for (const entry of first.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "history entry is present",
      entry !== null && entry !== undefined,
    );
  }
  const second =
    await api.functional.erpHrmTime.member.projects.tasks.historyEntries.index(
      memberConnection,
      {
        projectId,
        taskId,
        body,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination remains stable",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "history listing remains stable",
    second.data,
    first.data,
  );
}
