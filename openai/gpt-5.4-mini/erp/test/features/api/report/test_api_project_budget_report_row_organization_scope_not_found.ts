import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_budget_report_row_organization_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/register",
      referrer: "https://example.com/erp/start",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const projectBudgetReportRowId =
    `00000000-0000-0000-0000-${RandomGenerator.alphabets(12).slice(0, 12)}` as string &
      tags.Format<"uuid">;
  await TestValidator.httpError(
    "project budget report row outside organization scope should not be found",
    404,
    async () => {
      await api.functional.erpHrmTime.member.reports.project_budget_report_rows.at(
        memberConnection,
        {
          projectBudgetReportRowId,
        },
      );
    },
  );
}
