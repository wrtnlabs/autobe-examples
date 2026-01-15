import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportDispute";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_report_disputes_filtered_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Ensure connection has authorization headers for member
  const memberHeaders = memberConnection.headers;
  typia.assert(memberHeaders?.Authorization);
  // Calculate date range (last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Make disputes request with status filter and date range
  const disputesResponse: IPageICommunityPlatformReportDispute.ISummary =
    await api.functional.communityPlatform.member.report.disputes.index(
      memberConnection,
      {
        body: {
          startDate: sevenDaysAgo.toISOString(),
          endDate: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformReportDispute.IRequest,
      },
    );
  typia.assert(disputesResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "page number is 1",
    disputesResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", disputesResponse.pagination.limit, 20);
  TestValidator.predicate(
    "total records > 0",
    disputesResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages > 0",
    disputesResponse.pagination.pages > 0,
  );
  // Validate all returned disputes have status 'pending'
  TestValidator.predicate(
    "all disputes have pending status",
    disputesResponse.data.every((dispute) => dispute.status === "pending"),
  );
  // Validate all returned disputes have created_at within date range
  TestValidator.predicate(
    "all disputes have created_at in last 7 days",
    disputesResponse.data.every(
      (dispute) =>
        new Date(dispute.created_at) >= sevenDaysAgo &&
        new Date(dispute.created_at) <= now,
    ),
  );
}
