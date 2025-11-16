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
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";

export async function test_api_comment_report_search_by_status_and_severity(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create a community as the member
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Join the community (membership)
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create several comments under the post
  const commentCount = 3;
  const comments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 3 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentBody,
        },
      );
    typia.assert<ICommunityPlatformComment>(comment);
    comments.push(comment);
  }

  // 6. Create multiple comment reports as the member
  const reasonCategories = ["spam", "harassment", "hate"] as const;

  const createdReports: ICommunityPlatformCommentReport[] = [];
  // We will focus on the first comment for filter checks
  const targetComment = comments[0];

  for (let i = 0; i < 4; i++) {
    const reportBody = {
      comment_id: targetComment.id,
      reason_category: RandomGenerator.pick(reasonCategories),
      reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformCommentReport.ICreate;

    const report: ICommunityPlatformCommentReport =
      await api.functional.communityPlatform.memberUser.commentReports.create(
        connection,
        { body: reportBody },
      );
    typia.assert<ICommunityPlatformCommentReport>(report);
    createdReports.push(report);
  }

  // 7. Register and authenticate an admin user
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}-admin@example.com`,
    password: "Password123!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // Explicitly login as admin to ensure token is set via login flow as well
  const adminLoginBody = {
    identifier: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoggedIn);

  // 8. Discover a status+severity combination for the newly created reports.
  // We restrict search to the target comment_id so we are likely only seeing
  // the reports we just created (plus any pre-existing ones on that comment).
  const discoveryRequestBody = {
    page: 1,
    limit: 20,
    status: undefined,
    severity: undefined,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: targetComment.id,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ICommunityPlatformCommentReport.IRequest;

  const discoveryPage: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.adminUser.commentReports.index(
      connection,
      { body: discoveryRequestBody },
    );
  typia.assert<IPageICommunityPlatformCommentReport.ISummary>(discoveryPage);

  TestValidator.predicate(
    "discovery search returns at least one comment report for target comment",
    discoveryPage.pagination.records > 0,
  );

  // Pick one summary from discovery to capture its status and severity
  const discoveredSummary = discoveryPage.data[0];
  const filterStatus = discoveredSummary.status;
  const filterSeverity = discoveredSummary.severity;

  // 9. Call index with combined filters: status + severity + comment_id
  const filteredRequestBody = {
    page: 1,
    limit: 10,
    status: filterStatus,
    severity: filterSeverity,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: targetComment.id,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ICommunityPlatformCommentReport.IRequest;

  const filteredPage: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.adminUser.commentReports.index(
      connection,
      { body: filteredRequestBody },
    );
  typia.assert<IPageICommunityPlatformCommentReport.ISummary>(filteredPage);

  // Business validation: every returned summary matches filters
  for (const summary of filteredPage.data) {
    TestValidator.equals(
      "filtered report has requested status",
      summary.status,
      filterStatus,
    );
    TestValidator.equals(
      "filtered report has requested severity",
      summary.severity,
      filterSeverity,
    );
    TestValidator.equals(
      "filtered report belongs to target comment",
      summary.comment.id,
      targetComment.id,
    );
  }

  TestValidator.predicate(
    "filtered pagination.records is positive",
    filteredPage.pagination.records > 0,
  );

  // 10. Pagination behavior with limit = 1
  const smallPageRequestBody = {
    page: 1,
    limit: 1,
    status: filterStatus,
    severity: filterSeverity,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: targetComment.id,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ICommunityPlatformCommentReport.IRequest;

  const smallPage: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.adminUser.commentReports.index(
      connection,
      { body: smallPageRequestBody },
    );
  typia.assert<IPageICommunityPlatformCommentReport.ISummary>(smallPage);

  TestValidator.equals(
    "small page current index is 1",
    smallPage.pagination.current,
    1,
  );
  TestValidator.equals("small page limit is 1", smallPage.pagination.limit, 1);

  TestValidator.predicate(
    "small page has at least one record when records > 0",
    smallPage.pagination.records === 0 || smallPage.data.length === 1,
  );

  // If there are more records than the page limit, expect multiple pages
  if (smallPage.pagination.records > smallPage.pagination.limit) {
    TestValidator.predicate(
      "pagination.pages is at least 2 when records exceed limit",
      smallPage.pagination.pages >= 2,
    );
  }
}
