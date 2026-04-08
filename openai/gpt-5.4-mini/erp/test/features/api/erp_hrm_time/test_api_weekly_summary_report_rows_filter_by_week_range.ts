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

export async function test_api_weekly_summary_report_rows_filter_by_week_range(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.erpHrmTime.auth.member.join(
    memberConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
          tags.Format<"email">,
        password: "P@ssw0rd123!" satisfies string & tags.Format<"password">,
        displayName: RandomGenerator.name(),
        href: "https://example.com/onboarding" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/referrer" satisfies string &
          tags.Format<"uri">,
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(member);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const broadRequest = {
    weekStartDateFrom: "2026-01-01T00:00:00.000Z",
    weekStartDateTo: "2026-12-31T23:59:59.999Z",
    weekEndDateFrom: "2026-01-04T00:00:00.000Z",
    weekEndDateTo: "2026-12-31T23:59:59.999Z",
    page: 1,
    limit: 100,
  } satisfies IErpHrmTimeWeeklySummaryReportRow.IRequest;
  const broad =
    await api.functional.erpHrmTime.member.organizations.weeklySummaryReportRows.index(
      memberConnection,
      {
        organizationId,
        body: broadRequest,
      },
    );
  typia.assert(broad);
  TestValidator.predicate(
    "broad pagination exists",
    () =>
      broad.pagination.current >= 0 &&
      broad.pagination.limit >= 0 &&
      broad.pagination.records >= 0 &&
      broad.pagination.pages >= 0,
  );
  TestValidator.predicate("broad rows sorted by weekStartDate ascending", () =>
    broad.data.every(
      (row, index, array) =>
        index === 0 || array[index - 1].weekStartDate <= row.weekStartDate,
    ),
  );
  TestValidator.predicate("broad rows stay inside the inclusive range", () =>
    broad.data.every(
      (row) =>
        row.organization.id === organizationId &&
        row.weekStartDate >= broadRequest.weekStartDateFrom! &&
        row.weekStartDate <= broadRequest.weekStartDateTo! &&
        row.weekEndDate >= broadRequest.weekEndDateFrom! &&
        row.weekEndDate <= broadRequest.weekEndDateTo!,
    ),
  );
  const narrowRequest = {
    weekStartDateFrom: "2026-04-01T00:00:00.000Z",
    weekStartDateTo: "2026-06-30T23:59:59.999Z",
    weekEndDateFrom: "2026-04-05T00:00:00.000Z",
    weekEndDateTo: "2026-07-05T23:59:59.999Z",
    page: 1,
    limit: 100,
  } satisfies IErpHrmTimeWeeklySummaryReportRow.IRequest;
  const narrow =
    await api.functional.erpHrmTime.member.organizations.weeklySummaryReportRows.index(
      memberConnection,
      {
        organizationId,
        body: narrowRequest,
      },
    );
  typia.assert(narrow);
  TestValidator.predicate(
    "narrow pagination exists",
    () =>
      narrow.pagination.current >= 0 &&
      narrow.pagination.limit >= 0 &&
      narrow.pagination.records >= 0 &&
      narrow.pagination.pages >= 0,
  );
  TestValidator.predicate("narrow rows sorted by weekStartDate ascending", () =>
    narrow.data.every(
      (row, index, array) =>
        index === 0 || array[index - 1].weekStartDate <= row.weekStartDate,
    ),
  );
  TestValidator.predicate("narrow rows stay inside the inclusive range", () =>
    narrow.data.every(
      (row) =>
        row.organization.id === organizationId &&
        row.weekStartDate >= narrowRequest.weekStartDateFrom! &&
        row.weekStartDate <= narrowRequest.weekStartDateTo! &&
        row.weekEndDate >= narrowRequest.weekEndDateFrom! &&
        row.weekEndDate <= narrowRequest.weekEndDateTo!,
    ),
  );
  TestValidator.predicate("narrow rows are contained in broad rows", () =>
    narrow.data.every((narrowRow) =>
      broad.data.some((broadRow) => broadRow.id === narrowRow.id),
    ),
  );
}
