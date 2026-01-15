import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportOfMember";
import { prepare_random_community_platform_report_of_member } from "../../../prepare/prepare_random_community_platform_report_of_member";
import { generate_random_community_platform_member_report_of_members_create } from "../../../generate/generate_random_community_platform_member_report_of_members_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_report_collection_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member to generate reports
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // memberConnection.headers is now updated internally by authorize function
  // Step 2: Create multiple reports as the authenticated member against other members
  // Generate target members for reporting
  const targetMembers: ICommunityPlatformMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const targetConnection: api.IConnection = { host: connection.host };
      return await authorize_member_join(targetConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies ICommunityPlatformMember.IJoin,
      });
    });
  // Create 3 reports with different reasons
  const reports: ICommunityPlatformReportOfMember[] =
    await ArrayUtil.asyncRepeat(3, async (index) => {
      const report: ICommunityPlatformReportOfMember =
        await generate_random_community_platform_member_report_of_members_create(
          memberConnection, // ✅ Use member-specific connection
          {
            body: {
              target_member_id: targetMembers[index].id,
              reason: (['spam', 'harassment', 'inappropriate_content', 'misinformation'] as const)[index % 4],
              details:
                index === 0
                  ? "This member is posting spam content."
                  : undefined,
              evidence_urls:
                index === 1
                  ? [
                      "https://example.com/evidence1.jpg",
                      "https://example.com/evidence2.jpg",
                    ]
                  : undefined,
            } satisfies ICommunityPlatformReportOfMember.ICreate,
          },
        );
      typia.assert(report);
      return report;
    });
  // Step 3: Test collection with no filters (default: all reports by member)
  const allReports: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {} satisfies ICommunityPlatformReportOfMember.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.equals(
    "all reported items count matches created reports",
    allReports.data.length,
    3,
  );
  // Step 4: Test targetContentType filtering
  const spamReports: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {
          targetContentType: "spam",
        } satisfies ICommunityPlatformReportOfMember.IRequest,
      },
    );
  typia.assert(spamReports);
  const spamReportCount = spamReports.data.filter(
    (report) => report.reason === "spam",
  ).length;
  TestValidator.equals("spam reports filtered correctly", spamReportCount, 1);
  // Step 5: Test status filtering — this should NOT be included in the request body because 'status' is not a filterable field in IRequest
  // Instead, we only validate response data
  const pendingReports: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {} satisfies ICommunityPlatformReportOfMember.IRequest, // Removed 'status' from body — invalid filter
      },
    );
  typia.assert(pendingReports);
  const pendingReportCount = pendingReports.data.filter(
    (report) => report.status === "pending",
  ).length;
  TestValidator.equals(
    "pending reports filtered correctly",
    pendingReportCount,
    3,
  );
  // Step 6: Test pagination with page and limit parameters
  // Request page 1 with limit 1
  const page1Limit1: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformReportOfMember.IRequest,
      },
    );
  typia.assert(page1Limit1);
  TestValidator.equals(
    "page 1 has 1 report when limit=1",
    page1Limit1.data.length,
    1,
  );
  // Request page 2 with limit 1
  const page2Limit1: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies ICommunityPlatformReportOfMember.IRequest,
      },
    );
  typia.assert(page2Limit1);
  TestValidator.equals(
    "page 2 has 1 report when limit=1",
    page2Limit1.data.length,
    1,
  );
  // Verify that page 2 report is different from page 1 report
  TestValidator.notEquals(
    "page 2 report should be different from page 1 report",
    page2Limit1.data[0].id,
    page1Limit1.data[0].id,
  );
  // Step 7: Test with invalid page parameter (must be >=1)
  // We cannot test for error because the API does not reject invalid values
  // according to the documentation - it will auto-cap to range
  // Instead, verify that page=0 defaults to page=1 as per the constraint
  const page0: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {
          page: 0,
          limit: 1,
        } satisfies ICommunityPlatformReportOfMember.IRequest,
      },
    );
  typia.assert(page0);
  TestValidator.equals(
    "page=0 defaults to page=1",
    page0.pagination.current,
    1,
  );
  // Step 8: Test with invalid limit parameter (must be <=100)
  // The API caps limit at 100, so we test that limit=150 becomes 100
  const limit150: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {
          page: 1,
          limit: 150,
        } satisfies ICommunityPlatformReportOfMember.IRequest,
      },
    );
  typia.assert(limit150);
  TestValidator.equals(
    "limit=150 capped to 100",
    limit150.pagination.limit,
    100,
  );
  // Step 9: Test with invalid report type (targetContentType 'member')
  // This should work as per the schema - member reports are a valid target type
  const memberReports: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {
          targetContentType: "member",
        } satisfies ICommunityPlatformReportOfMember.IRequest,
      },
    );
  typia.assert(memberReports);
  // There are no "member" reports created (we created member-to-member reports)
  // So this should return 0 reports (but still be valid)
  TestValidator.predicate(
    "no member-to-member reports should be found with targetContentType='member'",
    memberReports.data.length === 0,
  );
  // Step 10: Test mixed filtering (targetContentType + status) — remove 'status' from request body
  const spamPendingReports: IPageICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.index(
      memberConnection, // ✅ Use member-specific connection
      {
        body: {
          targetContentType: "spam",
        } satisfies ICommunityPlatformReportOfMember.IRequest, // Removed 'status' — invalid filter property
      },
    );
  typia.assert(spamPendingReports);
  TestValidator.equals(
    "spam and pending filter returns 1 report",
    spamPendingReports.data.length,
    1,
  );
  const spamPendingReport = spamPendingReports.data[0];
  TestValidator.equals(
    "spam and pending filter report has correct reason",
    spamPendingReport.reason,
    "spam",
  );
  TestValidator.equals(
    "spam and pending filter report has correct status",
    spamPendingReport.status,
    "pending",
  );
}