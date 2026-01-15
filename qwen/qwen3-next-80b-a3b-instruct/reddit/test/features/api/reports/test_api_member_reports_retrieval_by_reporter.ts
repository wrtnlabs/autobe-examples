import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_reports_retrieval_by_reporter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberCreds });
  typia.assert(member);
  // Step 2: Retrieve member's reports with pagination parameters
  const reportsResponse: IPageICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.index(
      memberConnection,
      {
        body: {
          reporter_id: member.id,
          limit: 10,
          offset: 0,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(reportsResponse);
  // Step 3: Validate the response structure
  TestValidator.equals(
    "pagination limit matches",
    reportsResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page matches",
    reportsResponse.pagination.current,
    1,
  );
  // Step 4: Validate that the response contains the expected metrics properties
  for (const report of reportsResponse.data) {
    TestValidator.predicate(
      "report has daily_report_rate",
      report.daily_report_rate >= 0,
    );
    TestValidator.predicate(
      "report has weekly_growth_rate",
      report.weekly_growth_rate >= -1 && report.weekly_growth_rate <= 1,
    );
    TestValidator.predicate(
      "report has monthly_growth_rate",
      report.monthly_growth_rate >= -1 && report.monthly_growth_rate <= 1,
    );
  }
  // Step 5: Validate that pagination metadata correctly reflects data
  TestValidator.predicate(
    "pagination records matches data count",
    reportsResponse.pagination.records === reportsResponse.data.length,
  );
}
