import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

/**
 * Test that a community moderator can view grouped reports for their community.
 * 1. Create community owner, community, and assign moderator role
 * 2. Create test content (post and comments)
 * 3. Have multiple users report the same content
 * 4. Validate grouped reports endpoint shows proper grouping
 */
export async function test_api_reports_grouped_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 4. Assign moderator role to moderator in community
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        body: {
          memberId: moderator.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderationRole);
  TestValidator.equals(
    "moderator assigned",
    moderationRole.member.id,
    moderator.id,
  );
  TestValidator.equals(
    "community matches",
    moderationRole.community.id,
    community.id,
  );
  // 5. Create regular member accounts for reporting (3 reporters)
  const reporterConnections: api.IConnection[] = [];
  const reporters: ICommunityPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const reporterConnection: api.IConnection = { host: connection.host };
    reporterConnections.push(reporterConnection);
    const reporter = await authorize_member_join(reporterConnection, {});
    typia.assert(reporter);
    reporters.push(reporter);
  }
  // 6. Create a test post in the community (by first reporter)
  const post = await generate_random_community_platform_member_posts_create(
    reporterConnections[0],
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  // 7. Create test comments on the post (by different reporters)
  const comments: ICommunityPlatformComment[] = [];
  // First comment by reporter 1
  const comment1 =
    await generate_random_community_platform_member_posts_comments_create(
      reporterConnections[1],
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment1);
  comments.push(comment1);
  // Second comment by reporter 2
  const comment2 =
    await generate_random_community_platform_member_posts_comments_create(
      reporterConnections[2],
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment2);
  comments.push(comment2);
  // 8. Submit reports against the post by different users
  const postReports: ICommunityPlatformContentReport[] = [];
  const postReportReasons = [
    "Inappropriate content",
    "Spam or misleading",
    "Harassment or bullying",
  ];
  for (let i = 0; i < 3; i++) {
    const report =
      await generate_random_community_platform_member_reports_create(
        reporterConnections[i],
        {
          body: {
            reason: postReportReasons[i],
            postId: post.id,
          } satisfies ICommunityPlatformContentReport.ICreate,
        },
      );
    typia.assert(report);
    postReports.push(report);
    TestValidator.equals("report status pending", report.status, "pending");
    TestValidator.equals(
      "reporter matches",
      report.reporter.id,
      reporters[i].id,
    );
    TestValidator.equals(
      "community matches",
      report.community.id,
      community.id,
    );
    TestValidator.predicate(
      "post report exists",
      () => report.postReport !== null,
    );
  }
  // 9. Submit reports against a comment by different users
  const commentReports: ICommunityPlatformContentReport[] = [];
  const commentReportReasons = [
    "Hate speech",
    "Personal attack",
    "Off-topic discussion",
  ];
  // Report the first comment
  for (let i = 0; i < 3; i++) {
    const report =
      await generate_random_community_platform_member_reports_create(
        reporterConnections[i],
        {
          body: {
            reason: commentReportReasons[i],
            commentId: comment1.id,
          } satisfies ICommunityPlatformContentReport.ICreate,
        },
      );
    typia.assert(report);
    commentReports.push(report);
    TestValidator.equals("report status pending", report.status, "pending");
    TestValidator.equals(
      "reporter matches",
      report.reporter.id,
      reporters[i].id,
    );
    TestValidator.equals(
      "community matches",
      report.community.id,
      community.id,
    );
    TestValidator.predicate(
      "comment report exists",
      () => report.commentReport !== null,
    );
  }
  // 10. Moderator retrieves grouped reports
  const groupedReports =
    await api.functional.communityPlatform.member.reports.grouped.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          community_id: community.id,
        } satisfies ICommunityPlatformContentReport.IGroupedRequest,
      },
    );
  typia.assert(groupedReports);
  // 11. Validate grouped reports structure
  TestValidator.equals("total records", groupedReports.pagination.records, 2); // 1 post group + 1 comment group
  TestValidator.equals("two groups returned", groupedReports.data.length, 2);
  // 12. Identify post group and comment group
  let postGroup: ICommunityPlatformContentReport.IGroupedSummary | undefined;
  let commentGroup: ICommunityPlatformContentReport.IGroupedSummary | undefined;
  for (const group of groupedReports.data) {
    typia.assert(group);
    TestValidator.equals("community matches", group.community.id, community.id);
    if (group.content_type === "post") {
      postGroup = group;
      TestValidator.equals(
        "post content id matches",
        group.content_id,
        post.id,
      );
    } else if (group.content_type === "comment") {
      commentGroup = group;
      TestValidator.equals(
        "comment content id matches",
        group.content_id,
        comment1.id,
      );
    }
  }
  TestValidator.predicate("post group exists", () => postGroup !== undefined);
  TestValidator.predicate(
    "comment group exists",
    () => commentGroup !== undefined,
  );
  // 13. Validate post group details
  if (postGroup) {
    TestValidator.equals("post total reports", postGroup.total_reports, 3);
    TestValidator.equals(
      "post individual reports count",
      postGroup.individual_reports.length,
      3,
    );
    // Validate individual reports in post group
    const postGroupReportIds = new Set(
      postGroup.individual_reports.map((r) => r.id),
    );
    for (const postReport of postReports) {
      TestValidator.predicate("post report in group", () =>
        postGroupReportIds.has(postReport.id),
      );
    }
    // Validate reporters and reasons
    for (let i = 0; i < postGroup.individual_reports.length; i++) {
      const individualReport = postGroup.individual_reports[i];
      typia.assert(individualReport);
      TestValidator.equals(
        "report status pending",
        individualReport.status,
        "pending",
      );
      TestValidator.predicate(
        "post report exists",
        () => individualReport.postReport !== null,
      );
      // Find matching original report
      const originalReport = postReports.find(
        (r) => r.id === individualReport.id,
      );
      TestValidator.predicate(
        "original report found",
        () => originalReport !== undefined,
      );
      if (originalReport) {
        TestValidator.equals(
          "reason matches",
          individualReport.reason,
          originalReport.reason,
        );
        TestValidator.equals(
          "reporter matches",
          individualReport.reporter.id,
          originalReport.reporter.id,
        );
      }
    }
  }
  // 14. Validate comment group details
  if (commentGroup) {
    TestValidator.equals(
      "comment total reports",
      commentGroup.total_reports,
      3,
    );
    TestValidator.equals(
      "comment individual reports count",
      commentGroup.individual_reports.length,
      3,
    );
    // Validate individual reports in comment group
    const commentGroupReportIds = new Set(
      commentGroup.individual_reports.map((r) => r.id),
    );
    for (const commentReport of commentReports) {
      TestValidator.predicate("comment report in group", () =>
        commentGroupReportIds.has(commentReport.id),
      );
    }
    // Validate reporters and reasons
    for (let i = 0; i < commentGroup.individual_reports.length; i++) {
      const individualReport = commentGroup.individual_reports[i];
      typia.assert(individualReport);
      TestValidator.equals(
        "report status pending",
        individualReport.status,
        "pending",
      );
      TestValidator.predicate(
        "comment report exists",
        () => individualReport.commentReport !== null,
      );
      // Find matching original report
      const originalReport = commentReports.find(
        (r) => r.id === individualReport.id,
      );
      TestValidator.predicate(
        "original report found",
        () => originalReport !== undefined,
      );
      if (originalReport) {
        TestValidator.equals(
          "reason matches",
          individualReport.reason,
          originalReport.reason,
        );
        TestValidator.equals(
          "reporter matches",
          individualReport.reporter.id,
          originalReport.reporter.id,
        );
      }
    }
  }
  // 15. Validate timestamps
  if (postGroup) {
    TestValidator.predicate(
      "latest report after first",
      () =>
        new Date(postGroup!.latest_report_at) >=
        new Date(postGroup!.first_report_at),
    );
  }
  if (commentGroup) {
    TestValidator.predicate(
      "latest comment report after first",
      () =>
        new Date(commentGroup!.latest_report_at) >=
        new Date(commentGroup!.first_report_at),
    );
  }
  // 16. Test that moderator cannot see reports from other communities
  // Create another community and report there
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase() + "_other",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(otherCommunity);
  // Create a post in other community and report it
  const otherPost =
    await generate_random_community_platform_member_posts_create(
      reporterConnections[0],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: otherCommunity.name,
          content_type: "TEXT",
          content_text: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(otherPost);
  const otherReport =
    await generate_random_community_platform_member_reports_create(
      reporterConnections[0],
      {
        body: {
          reason: "Report from other community",
          postId: otherPost.id,
        } satisfies ICommunityPlatformContentReport.ICreate,
      },
    );
  typia.assert(otherReport);
  // Get grouped reports with community filter
  const filteredGroupedReports =
    await api.functional.communityPlatform.member.reports.grouped.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          community_id: community.id,
        } satisfies ICommunityPlatformContentReport.IGroupedRequest,
      },
    );
  typia.assert(filteredGroupedReports);
  // Should still only see 2 groups from original community
  TestValidator.equals(
    "filtered total records",
    filteredGroupedReports.pagination.records,
    2,
  );
  TestValidator.equals(
    "filtered groups count",
    filteredGroupedReports.data.length,
    2,
  );
  // All groups should be from the specified community
  for (const group of filteredGroupedReports.data) {
    TestValidator.equals(
      "group from correct community",
      group.community.id,
      community.id,
    );
  }
}
