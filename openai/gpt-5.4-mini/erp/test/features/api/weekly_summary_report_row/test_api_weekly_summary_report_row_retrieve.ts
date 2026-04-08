import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeWeeklySummaryReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_row_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const weeklySummaryReportRowId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-organization row should not be accessible",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.organizations.weeklySummaryReportRows.at(
        memberConnection,
        {
          organizationId,
          weeklySummaryReportRowId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "non-existent weekly summary row should not be found",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.organizations.weeklySummaryReportRows.at(
        memberConnection,
        {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
          weeklySummaryReportRowId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
