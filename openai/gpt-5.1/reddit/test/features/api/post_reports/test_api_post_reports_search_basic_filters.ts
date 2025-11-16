import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportTarget";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

/**
 * Validate adminUser post report search with basic filters and pagination.
 *
 * Business workflow:
 *
 * 1. MemberUser joins and becomes authenticated.
 * 2. MemberUser creates a community.
 * 3. MemberUser creates multiple posts in that community.
 * 4. MemberUser files several post reports against those posts using different
 *    severities.
 * 5. MemberUser also creates a community report and a user report to ensure other
 *    report types exist.
 * 6. AdminUser joins and logs in, gaining admin context.
 * 7. AdminUser searches postReports via PATCH
 *    /communityPlatform/adminUser/postReports using filters:
 *
 *    - TargetType: "post"
 *    - Status: e.g. "open"
 *    - Severity: e.g. "high"
 *    - CommunityId: the created community.id
 *    - Page/pageSize plus sortBy/sortDirection on created_at.
 * 8. Validate that the paginated response:
 *
 *    - Has pagination.current and pagination.limit equal to the requested page and
 *         pageSize.
 *    - Contains only reports where type === "post".
 *    - All reports have matching status, severity and belong to the target
 *         community.
 *    - Is ordered by created_at descending when requested.
 */
export async function test_api_post_reports_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (reporter and content creator)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. memberUser creates a community
  const communityCreateBody = {
    slug: `${RandomGenerator.alphabets(8)}-community`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. memberUser creates multiple posts in that community
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    4,
    async (index) => {
      const postBody = {
        communityId: community.id,
        communityCode: community.slug,
        title: `Post ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: postBody },
        );
      typia.assert(post);
      return post;
    },
  );

  // 4. Create post reports with mixed severities
  const targetSeverityHigh = "high";
  const targetStatusOpen = "open";

  const reportInputs: {
    post: ICommunityPlatformPost;
    severity: string;
  }[] = [
    { post: posts[0], severity: targetSeverityHigh },
    { post: posts[1], severity: targetSeverityHigh },
    { post: posts[2], severity: "low" },
    { post: posts[3], severity: targetSeverityHigh },
  ];

  const postReports: ICommunityPlatformPostReport[] = await ArrayUtil.asyncMap(
    reportInputs,
    async (input) => {
      const reportBody = {
        post_id: input.post.id,
        reason_category: "spam",
        reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
        severity: input.severity,
      } satisfies ICommunityPlatformPostReport.ICreate;

      const report: ICommunityPlatformPostReport =
        await api.functional.communityPlatform.memberUser.postReports.create(
          connection,
          { body: reportBody },
        );
      typia.assert(report);
      return report;
    },
  );

  // Ensure that we created at least one post report
  TestValidator.predicate(
    "should have created at least one post report",
    postReports.length > 0,
  );

  // 5. Create community-level and user-level reports for richness
  const communityReportBody = {
    community_id: community.id,
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const communityReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      { body: communityReportBody },
    );
  typia.assert(communityReport);

  const userReportBody = {
    reported_memberuser_id: memberAuthorized.id,
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    status: targetStatusOpen,
    severity: targetSeverityHigh,
  } satisfies ICommunityPlatformUserReport.ICreate;

  const userReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      { body: userReportBody },
    );
  typia.assert(userReport);

  // 6. Create an adminUser and login (admin context)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Admin searches post reports with filters and pagination
  const page = 1 as number & tags.Type<"int32">;
  const pageSize = 10 as number & tags.Type<"int32">;

  const searchRequestBody = {
    page,
    pageSize,
    targetType: "post",
    status: targetStatusOpen,
    severity: targetSeverityHigh,
    reportedUserId: undefined,
    reportingUserId: undefined,
    communityId: community.id,
    from: undefined,
    to: undefined,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPostReport.IRequest;

  const pageResult: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.postReports.index(
      connection,
      { body: searchRequestBody },
    );
  typia.assert(pageResult);

  // 8. Validate pagination metadata
  const pagination: IPage.IPagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current equals requested page",
    searchRequestBody.page,
    pagination.current,
  );
  TestValidator.equals(
    "pagination limit equals requested pageSize",
    searchRequestBody.pageSize,
    pagination.limit,
  );

  // 9. Validate that all returned summaries match filters and are correctly scoped
  const summaries: ICommunityPlatformPostReport.ISummary[] = pageResult.data;

  for (let i = 0; i < summaries.length; i++) {
    const summary = summaries[i];

    TestValidator.equals(`summary[${i}] type is post`, "post", summary.type);

    if (searchRequestBody.severity !== undefined) {
      TestValidator.equals(
        `summary[${i}] severity matches filter`,
        searchRequestBody.severity,
        summary.severity,
      );
    }

    if (searchRequestBody.status !== undefined) {
      TestValidator.equals(
        `summary[${i}] status matches filter`,
        searchRequestBody.status,
        summary.status,
      );
    }

    if (summary.target.community) {
      TestValidator.equals(
        `summary[${i}] target community id matches`,
        community.id,
        summary.target.community.id,
      );
    }
  }

  // 10. Verify created_at ordering when sortBy/sortDirection specified
  const createdAtList = summaries.map((s) => s.created_at);
  for (let i = 1; i < createdAtList.length; i++) {
    const prev = createdAtList[i - 1];
    const curr = createdAtList[i];
    TestValidator.predicate(
      `created_at ordering desc at index ${i}`,
      prev >= curr,
    );
  }
}
