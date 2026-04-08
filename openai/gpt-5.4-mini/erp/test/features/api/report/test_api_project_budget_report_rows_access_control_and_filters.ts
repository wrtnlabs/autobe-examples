import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectBudgetReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_budget_report_rows_access_control_and_filters(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}` satisfies string &
        tags.Format<"uri">,
      referrer:
        `https://ref.example.com/${RandomGenerator.alphaNumeric(8)}` satisfies string &
          tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 20,
    sort: "+reportDate",
    reportDateFrom: "2026-01-01T00:00:00.000Z",
    reportDateTo: "2026-12-31T23:59:59.999Z",
    periodStartDateFrom: "2026-01-01T00:00:00.000Z",
    periodStartDateTo: "2026-12-31T23:59:59.999Z",
    periodEndDateFrom: "2026-01-01T00:00:00.000Z",
    periodEndDateTo: "2026-12-31T23:59:59.999Z",
  } satisfies IErpHrmTimeProjectBudgetReportRow.IRequest;
  const requestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "project budget report rows access should reject an inaccessible organization context",
    async () => {
      await api.functional.erpHrmTime.member.organizations.projectBudgetReportRows.index(
        requestConnection,
        {
          organizationId,
          body: request,
        },
      );
    },
  );
}
