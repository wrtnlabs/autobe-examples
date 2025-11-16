import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportTarget";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

export async function test_api_post_reports_search_time_window_and_severity(
  connection: api.IConnection,
) {
  // 1. Register a memberUser who will create communities, posts, and reports
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Create multiple post reports with different severities at different times
  // We cannot directly control created_at, so we simulate temporal separation
  // by creating them sequentially and using their actual created_at values

  const highSeverityReportEarly: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: {
          post_id: post.id,
          reason_category: "spam",
          reason_detail: "Looks like spam content (early)",
          severity: "high",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(highSeverityReportEarly);

  const lowSeverityReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: {
          post_id: post.id,
          reason_category: "off-topic",
          reason_detail: "Minor issue, off-topic",
          severity: "low",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(lowSeverityReport);

  const highSeverityReportLate: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: {
          post_id: post.id,
          reason_category: "abuse",
          reason_detail: "Serious abuse report (late)",
          severity: "high",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(highSeverityReportLate);

  // Determine a time window using the actual created_at timestamps:
  // from = just after the early high-severity report
  // to = at/after the late high-severity report
  const fromDate = new Date(highSeverityReportEarly.created_at);
  const toDate = new Date(highSeverityReportLate.created_at);

  // Shift the from boundary slightly forward to try to exclude the early report
  const fromFilter = new Date(fromDate.getTime() + 1).toISOString();
  const toFilter = toDate.toISOString();

  // 5. Register an adminUser and login (adminUser.join already authenticates)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. As adminUser, search for high-severity reports in the chosen time window
  const filteredPage: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.postReports.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32">,
          pageSize: 50 as number & tags.Type<"int32">,
          targetType: "post",
          status: undefined,
          severity: "high",
          reportedUserId: undefined,
          reportingUserId: undefined,
          communityId: community.id,
          from: fromFilter,
          to: toFilter,
          sortBy: "created_at",
          sortDirection: "asc",
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(filteredPage);

  // 7. Validate that only newer high-severity reports are contained
  const filteredIds = filteredPage.data.map((r) => r.id);

  // highSeverityReportLate MUST be present
  TestValidator.predicate(
    "late high severity report is included within time/severity filter",
    filteredIds.includes(highSeverityReportLate.id),
  );

  // highSeverityReportEarly SHOULD be excluded because fromFilter is after its created_at
  TestValidator.predicate(
    "early high severity report is excluded by from boundary",
    filteredIds.includes(highSeverityReportEarly.id) === false,
  );

  // lowSeverityReport MUST be excluded because severity filter is "high"
  TestValidator.predicate(
    "low severity report is excluded by severity filter",
    filteredIds.includes(lowSeverityReport.id) === false,
  );

  // 8. Widen the window to include the early high-severity report as well
  const wideFrom = new Date(
    new Date(highSeverityReportEarly.created_at).getTime() - 1,
  ).toISOString();

  const widePage: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.postReports.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32">,
          pageSize: 50 as number & tags.Type<"int32">,
          targetType: "post",
          status: undefined,
          severity: "high",
          reportedUserId: undefined,
          reportingUserId: undefined,
          communityId: community.id,
          from: wideFrom,
          to: toFilter,
          sortBy: "created_at",
          sortDirection: "asc",
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(widePage);

  const wideIds = widePage.data.map((r) => r.id);

  // Now both high severity reports should be visible
  TestValidator.predicate(
    "wide window includes early high severity report",
    wideIds.includes(highSeverityReportEarly.id),
  );
  TestValidator.predicate(
    "wide window also includes late high severity report",
    wideIds.includes(highSeverityReportLate.id),
  );
}
