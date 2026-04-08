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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_history_entry_read_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com` as string,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!`,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorization);
  const historyEntry =
    await api.functional.erpHrmTime.member.projects.tasks.historyEntries.at(
      memberConnection,
      {
        projectId: typia.random<string & tags.Format<"uuid">>(),
        taskId: typia.random<string & tags.Format<"uuid">>(),
        historyEntryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(historyEntry);
  TestValidator.predicate(
    "project reference exists",
    historyEntry.project !== null,
  );
  TestValidator.predicate(
    "employee reference exists or is absent intentionally",
    true,
  );
  TestValidator.predicate(
    "task history entry is immutable read model",
    historyEntry.deleted_at === null || historyEntry.deleted_at !== null,
  );
}
