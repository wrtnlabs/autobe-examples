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
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";

/**
 * Validate that the admin comment report queue can be filtered by status and
 * severity.
 *
 * Business flow:
 *
 * 1. Create an admin user (join) and keep credentials for later login.
 * 2. Create a member user (join) who will own community, post, comments and
 *    reports.
 * 3. As member user, create a community and capture its slug.
 * 4. As member, join the community via memberships API so posting is allowed.
 * 5. As member, create a post in that community.
 * 6. As member, create two comments on the post.
 * 7. As member, cast votes on both comments to simulate engagement.
 * 8. As member, create at least two comment reports, each targeting one of the
 *    comments and using different reason_category values. Backend assigns
 *    status and severity.
 * 9. As admin, login and query the comment report queue using PATCH
 *    /communityPlatform/adminUser/reports/queues/comment with filters including
 *    status and severity to retrieve only a subset of reports.
 * 10. Validate that the responses contain only reports matching the filters and
 *     that pagination metadata is consistent with the filtered subset.
 */
export async function test_api_comment_report_queue_filtered_by_status_and_severity(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Admin#" + RandomGenerator.alphaNumeric(8);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Register member user
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "Member#" + RandomGenerator.alphaNumeric(8);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 3. As member, create community
  const communitySlug: string = RandomGenerator.alphaNumeric(12);
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
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Join community as member
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

  // 5. Create a post in community
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

  // 6. Create two comments on the post
  const commentBodies: ICommunityPlatformComment.ICreate[] = [
    {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    },
    {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    },
  ];

  const comments: ICommunityPlatformComment[] = [];
  for (const body of commentBodies) {
    const created: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(created);
    comments.push(created);
  }

  // 7. Cast votes on both comments
  const voteDirections = ["up", "down"] as const;
  const votes: ICommunityPlatformCommentVote[] = [];

  for (let i = 0; i < comments.length; i++) {
    const direction = voteDirections[i];
    const voteBody = {
      direction,
    } satisfies ICommunityPlatformCommentVote.ICreate;

    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: comments[i].id as string & tags.Format<"uuid">,
          body: voteBody,
        },
      );
    typia.assert(vote);
    votes.push(vote);
  }

  // 8. Create multiple comment reports with different reason_category
  const reasonCategories = ["spam", "harassment"] as const;

  const reportTargets: ICommunityPlatformComment[] = [comments[0], comments[1]];

  const reports: ICommunityPlatformCommentReport[] = [];

  for (let i = 0; i < reportTargets.length; i++) {
    const reportBody = {
      comment_id: reportTargets[i].id as string & tags.Format<"uuid">,
      reason_category: reasonCategories[i],
      reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformCommentReport.ICreate;

    const report: ICommunityPlatformCommentReport =
      await api.functional.communityPlatform.memberUser.commentReports.create(
        connection,
        {
          body: reportBody,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // 9. Login as admin for queue access
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // 10. Query the report queue without filters to discover statuses and severities
  const baseRequest: ICommunityPlatformCommentReport.IRequest = {
    page: 1,
    limit: 50,
    status: undefined,
    severity: undefined,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: undefined,
    order_by: undefined,
    order_direction: undefined,
  };

  const fullQueue: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.comment.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert(fullQueue);

  const ourReportIds = new Set(reports.map((r) => r.id));
  const ourSummaries = fullQueue.data.filter((summary) =>
    ourReportIds.has(summary.id),
  );

  TestValidator.predicate(
    "our created reports must appear in the admin queue",
    ourSummaries.length >= reports.length,
  );

  const primarySummary = ourSummaries[0];

  // 11. Filter queue by exact status and severity of the primary report
  const filteredRequest: ICommunityPlatformCommentReport.IRequest = {
    page: 1,
    limit: 50,
    status: primarySummary.status,
    severity: primarySummary.severity,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: undefined,
    order_by: undefined,
    order_direction: undefined,
  };

  const filteredPage: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.comment.index(
      connection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredPage);

  for (const summary of filteredPage.data) {
    TestValidator.equals(
      "filtered report status should match filter",
      summary.status,
      primarySummary.status,
    );
    TestValidator.equals(
      "filtered report severity should match filter",
      summary.severity,
      primarySummary.severity,
    );
  }

  TestValidator.predicate(
    "filtered pagination.records must be at least number of returned items",
    filteredPage.pagination.records >= filteredPage.data.length,
  );

  // 12. Filter by severity only to ensure filter independence
  const severityOnlyRequest: ICommunityPlatformCommentReport.IRequest = {
    page: 1,
    limit: 50,
    status: undefined,
    severity: primarySummary.severity,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: undefined,
    order_by: undefined,
    order_direction: undefined,
  };

  const severityOnlyPage: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.comment.index(
      connection,
      {
        body: severityOnlyRequest,
      },
    );
  typia.assert(severityOnlyPage);

  for (const summary of severityOnlyPage.data) {
    TestValidator.equals(
      "severity-only filter should constrain severity",
      summary.severity,
      primarySummary.severity,
    );
  }
}
