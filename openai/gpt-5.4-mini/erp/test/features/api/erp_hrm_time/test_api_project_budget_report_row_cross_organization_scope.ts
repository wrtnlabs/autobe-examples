import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_budget_report_row_cross_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/member",
      referrer: "https://example.com/referrer/member",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const projectBudgetReportRowId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "project budget report row should not be accessible outside the organization context",
    async () => {
      await api.functional.erpHrmTime.member.organizations.projectBudgetReportRows.at(
        memberConnection,
        {
          organizationId,
          projectBudgetReportRowId,
        },
      );
    },
  );
}
