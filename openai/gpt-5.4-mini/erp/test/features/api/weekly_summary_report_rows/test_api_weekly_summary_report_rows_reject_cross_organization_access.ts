import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeWeeklySummaryReportRow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeWeeklySummaryReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_rows_reject_cross_organization_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeWeeklySummaryReportRow.IRequest;
  await TestValidator.httpError(
    "should reject cross-organization weekly summary report access",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.organizations.weeklySummaryReportRows.index(
        memberConnection,
        {
          organizationId,
          body: request,
        },
      );
    },
  );
}
