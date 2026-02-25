import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_reports_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Test filtering by PENDING status
  const pendingReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          status: "PENDING",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "PENDING reports contain only PENDING status",
    pendingReports.data.every((report) => report.status === "PENDING"),
  );
  // 3. Test filtering by APPROVED status
  const approvedReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          status: "APPROVED",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.predicate(
    "APPROVED reports contain only APPROVED status",
    approvedReports.data.every((report) => report.status === "APPROVED"),
  );
  // 4. Test filtering by DISMISSED status
  const dismissedReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          status: "DISMISSED",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.predicate(
    "DISMISSED reports contain only DISMISSED status",
    dismissedReports.data.every((report) => report.status === "DISMISSED"),
  );
  // 5. Test with no status filter (should return all reports)
  const allReports = await api.functional.community.member.member.reports.index(
    memberConnection,
    {
      body: {
        status: null,
      } satisfies ICommunityReport.IRequest,
    },
  );
  typia.assert(allReports);
  // 6. Verify that unfiltered count equals sum of filtered counts
  const totalFilteredCount =
    pendingReports.pagination.records +
    approvedReports.pagination.records +
    dismissedReports.pagination.records;
  TestValidator.equals(
    "total filtered count equals unfiltered count",
    allReports.pagination.records,
    totalFilteredCount,
  );
  // 7. Verify pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    allReports.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    allReports.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    allReports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    allReports.pagination.pages >= 0,
  );
}
