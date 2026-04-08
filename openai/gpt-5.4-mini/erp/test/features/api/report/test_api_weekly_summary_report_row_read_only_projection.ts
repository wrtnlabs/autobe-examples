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

export async function test_api_weekly_summary_report_row_read_only_projection(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "member authorization access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "member authorization refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "member authorization expiration is present",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "member refreshable deadline is present",
    authorized.token.refreshable_until.length > 0,
  );
}
