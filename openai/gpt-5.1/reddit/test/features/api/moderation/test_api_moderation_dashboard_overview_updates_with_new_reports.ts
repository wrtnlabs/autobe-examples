import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboard";
import type { ICommunityPlatformModerationDashboardAccountRestrictionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardAccountRestrictionSummary";
import type { ICommunityPlatformModerationDashboardActionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardActionSummary";
import type { ICommunityPlatformModerationDashboardReportBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardReportBreakdown";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

export async function test_api_moderation_dashboard_overview_updates_with_new_reports(
  connection: api.IConnection,
) {
  // 1. Register and authenticate adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;

  // 2. Register and authenticate memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 3. As adminUser, get baseline dashboard overview
  // (adminUser is already authenticated from join)
  const baselineDashboard: ICommunityPlatformModerationDashboard =
    await api.functional.communityPlatform.adminUser.moderation.dashboard.overview.at(
      connection,
    );
  typia.assert(baselineDashboard);

  const baselineRecentReportCount = baselineDashboard.recentReportCount;
  const baselinePostTotal = baselineDashboard.postReportBreakdown.total;
  const baselineCommentTotal = baselineDashboard.commentReportBreakdown.total;
  const baselineCommunityTotal =
    baselineDashboard.communityReportBreakdown.total;
  const baselineUserTotal = baselineDashboard.userReportBreakdown.total;
  const baselineActionTotal =
    baselineDashboard.recentModerationActions.totalActions;

  // 4. Switch to memberUser explicitly via login to ensure member context
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Member creates a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Member joins the community (membership)
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
  typia.assert(membership);

  // 7. Member creates a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 8. Member creates a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 9. Member creates a post report
  const postReportCreateBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: "Inappropriate promotional content",
    severity: "medium",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const postReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: postReportCreateBody,
      },
    );
  typia.assert(postReport);

  // 10. Member creates a comment report
  const commentReportCreateBody = {
    comment_id: comment.id,
    reason_category: "abuse",
    reason_detail: "Harassing language",
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const commentReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: commentReportCreateBody,
      },
    );
  typia.assert(commentReport);

  // 11. Member creates a community report
  const communityReportCreateBody = {
    community_id: community.id,
    reason_category: "policy_violation",
    reason_detail: "Community encourages rule-breaking",
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const communityReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: communityReportCreateBody,
      },
    );
  typia.assert(communityReport);

  // 12. Member creates a user report targeting themselves (for simplicity)
  const userReportCreateBody = {
    reported_memberuser_id: memberId,
    reason_category: "self_report",
    reason_detail: "Testing moderation system",
    status: "open",
    severity: "low",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const userReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: userReportCreateBody,
      },
    );
  typia.assert(userReport);

  // 13. Switch back to adminUser via login to perform moderation actions
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 14. Admin creates a moderation case
  const moderationCaseCreateBody = {
    case_key: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    priority: "medium",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseCreateBody,
      },
    );
  typia.assert(moderationCase);

  // 15. Admin records a moderation action linked to the case
  const moderationActionCreateBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "note",
    scope: "user",
    reason_category: "review_started",
    reason_detail: "Initial review created by automated test",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 16. As adminUser, call the dashboard overview again to see updated metrics
  const updatedDashboard: ICommunityPlatformModerationDashboard =
    await api.functional.communityPlatform.adminUser.moderation.dashboard.overview.at(
      connection,
    );
  typia.assert(updatedDashboard);

  // 17. Validate that metrics increased as expected
  TestValidator.predicate(
    "recentReportCount should increase by at least 4",
    updatedDashboard.recentReportCount >= baselineRecentReportCount + 4,
  );

  TestValidator.predicate(
    "postReportBreakdown.total should increase by at least 1",
    updatedDashboard.postReportBreakdown.total >= baselinePostTotal + 1,
  );

  TestValidator.predicate(
    "commentReportBreakdown.total should increase by at least 1",
    updatedDashboard.commentReportBreakdown.total >= baselineCommentTotal + 1,
  );

  TestValidator.predicate(
    "communityReportBreakdown.total should increase by at least 1",
    updatedDashboard.communityReportBreakdown.total >=
      baselineCommunityTotal + 1,
  );

  TestValidator.predicate(
    "userReportBreakdown.total should increase by at least 1",
    updatedDashboard.userReportBreakdown.total >= baselineUserTotal + 1,
  );

  TestValidator.predicate(
    "recentModerationActions.totalActions should increase by at least 1",
    updatedDashboard.recentModerationActions.totalActions >=
      baselineActionTotal + 1,
  );
}
