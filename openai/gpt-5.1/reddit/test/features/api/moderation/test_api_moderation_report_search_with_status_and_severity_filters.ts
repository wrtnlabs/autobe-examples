import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportTarget";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

export async function test_api_moderation_report_search_with_status_and_severity_filters(
  connection: api.IConnection,
) {
  // 1. Register admin user and keep its credentials for later login.
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${adminUsername}@admin.example.com`;
  const adminPassword = "Admin#1234";

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdminUserJoin.IRequest,
    });
  typia.assert(adminJoin);

  // 2. Register member user who will own communities, posts, comments, and reports.
  const memberUsername = RandomGenerator.alphabets(8);
  const memberEmail = `${memberUsername}@member.example.com`;
  const memberPassword = "Member#1234";

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail as string & tags.Format<"email">,
        password: memberPassword,
        ip: null,
        href: "https://client.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://client.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(memberJoin);

  // Ensure we are authenticated as the memberUser for subsequent member-only operations.
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: null,
        href: "https://client.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://client.example.com" as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(memberLogin);

  // 3. Create a community as the member user.
  const communitySlug = `community-${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 4. Join the created community as a member.
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 5. Create two posts in the community.
  const createPost = async (): Promise<ICommunityPlatformPost> => {
    const body = {
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body },
      );
    typia.assert(post);
    return post;
  };

  const postHigh: ICommunityPlatformPost = await createPost();
  const postLow: ICommunityPlatformPost = await createPost();

  // 6. Create at least one comment per post.
  const createCommentForPost = async (
    post: ICommunityPlatformPost,
  ): Promise<ICommunityPlatformComment> => {
    const body = {
      content: RandomGenerator.paragraph({ sentences: 3 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(comment);
    return comment;
  };

  const commentOnHigh: ICommunityPlatformComment =
    await createCommentForPost(postHigh);
  const commentOnLow: ICommunityPlatformComment =
    await createCommentForPost(postLow);

  // 7. Create mixed post reports with different severities.
  const highPostReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: {
          post_id: postHigh.id as string & tags.Format<"uuid">,
          reason_category: "spam",
          reason_detail: "High severity spam post",
          severity: "high",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(highPostReport);

  const lowPostReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: {
          post_id: postLow.id as string & tags.Format<"uuid">,
          reason_category: "off_topic",
          reason_detail: "Low severity off-topic post",
          severity: "low",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(lowPostReport);

  // 8. Create a comment report.
  const commentReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: {
          comment_id: commentOnHigh.id as string & tags.Format<"uuid">,
          reason_category: "abuse",
          reason_detail: "Abusive comment",
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(commentReport);

  // 9. Create a community report.
  const communityReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: {
          community_id: community.id as string & tags.Format<"uuid">,
          reason_category: "policy_violation",
          reason_detail: "Community violating rules",
        } satisfies ICommunityPlatformCommunityReport.ICreate,
      },
    );
  typia.assert(communityReport);

  // 10. Switch to admin user by logging in.
  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com" as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformAdminUserLogin.IRequest,
    });
  typia.assert(adminLogin);

  // 11. Perform moderation report search filtered by severity="high".
  const highSeveritySearchBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    targetType: undefined,
    status: undefined,
    severity: "high",
    reportedUserId: undefined,
    reportingUserId: undefined,
    communityId: undefined,
    from: undefined,
    to: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformPostReport.IRequest;

  const highSeverityPage: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.reports.index(
      connection,
      { body: highSeveritySearchBody },
    );
  typia.assert(highSeverityPage);

  const highSeveritySummaries = highSeverityPage.data;

  // 11a. Assert that every returned summary has severity="high".
  for (const summary of highSeveritySummaries) {
    TestValidator.equals(
      "all returned reports must have severity high",
      summary.severity,
      "high",
    );
  }

  // 11b. Assert that at least one of the returned summaries corresponds to our explicit highPostReport.
  const hasHighPostReport = highSeveritySummaries.some(
    (summary) => summary.id === highPostReport.id,
  );

  TestValidator.predicate(
    "high severity search results must include created high post report",
    hasHighPostReport,
  );

  // 11c. Assert that the low severity post report does NOT appear in this result set.
  const hasLowPostReportInHighSet = highSeveritySummaries.some(
    (summary) => summary.id === lowPostReport.id,
  );

  TestValidator.predicate(
    "high severity search results must not include low severity post report",
    () => !hasLowPostReportInHighSet,
  );

  // 12. Optional: perform a second search combining severity="high" with targetType="post".
  const highPostSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    targetType: "post",
    status: undefined,
    severity: "high",
    reportedUserId: undefined,
    reportingUserId: undefined,
    communityId: undefined,
    from: undefined,
    to: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformPostReport.IRequest;

  const highPostPage: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.reports.index(
      connection,
      { body: highPostSearchBody },
    );
  typia.assert(highPostPage);

  const highPostSummaries = highPostPage.data;

  // 12a. Assert again all severities are high.
  for (const summary of highPostSummaries) {
    TestValidator.equals(
      "combined filter results must have severity high",
      summary.severity,
      "high",
    );
  }

  // 12b. Assert that each target.type (if present) is "post".
  for (const summary of highPostSummaries) {
    const target: ICommunityPlatformModerationReportTarget.ISummary =
      summary.target;
    TestValidator.equals(
      "combined filter results must have target type post",
      target.type,
      "post",
    );
  }
}
