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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_reports_statistics_moderator_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member who creates a community (becoming owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create a community to moderate
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a text post in the community to be reported
  const post = await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post to be reported
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      moderatorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. Authenticate as another member to submit reports
  const reporter1Connection: api.IConnection = { host: connection.host };
  const reporter1 = await authorize_member_join(reporter1Connection, {});
  typia.assert(reporter1);
  // 6. Report the post with a reason
  const postReport =
    await generate_random_community_platform_member_reports_create(
      reporter1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          postId: post.id,
        },
      },
    );
  typia.assert(postReport);
  // 7. Authenticate as third member to submit another report
  const reporter2Connection: api.IConnection = { host: connection.host };
  const reporter2 = await authorize_member_join(reporter2Connection, {});
  typia.assert(reporter2);
  // 8. Report the comment with a reason
  const commentReport =
    await generate_random_community_platform_member_reports_create(
      reporter2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          commentId: comment.id,
        },
      },
    );
  typia.assert(commentReport);
  // 9. Call the statistics endpoint with community filter
  const statistics =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          status: ["pending"],
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(statistics);
  // 10. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    statistics.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", statistics.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records at least 2",
    statistics.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    statistics.pagination.pages >= 1,
  );
  // 11. Validate report data
  TestValidator.predicate("data contains reports", statistics.data.length >= 2);
  // 12. Validate community filter works - all reports belong to the same community
  for (const report of statistics.data) {
    TestValidator.equals(
      "report community matches",
      report.community.id,
      community.id,
    );
    TestValidator.predicate(
      "report has reporter",
      report.reporter !== null && report.reporter.id !== undefined,
    );
    TestValidator.equals("report status is pending", report.status, "pending");
  }
  // 13. Count reports by content type
  const postReports = statistics.data.filter(
    (r) => r.reason.includes("post") || r.reason.includes("Post"),
  );
  const commentReports = statistics.data.filter(
    (r) => r.reason.includes("comment") || r.reason.includes("Comment"),
  );
  TestValidator.predicate(
    "has at least one post report",
    postReports.length >= 1,
  );
  TestValidator.predicate(
    "has at least one comment report",
    commentReports.length >= 1,
  );
  // 14. Validate date-based aggregation - reports should be recent
  for (const report of statistics.data) {
    const reportDate = new Date(report.created_at);
    const now = new Date();
    const diff = now.getTime() - reportDate.getTime();
    TestValidator.predicate(
      "report created within reasonable timeframe",
      diff < 1000 * 60 * 60 * 24 * 7,
    );
  }
}
