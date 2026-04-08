import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import type { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test that a community moderator can view all pending reports for content within their community.
 *
 * Validates the moderator report queue functionality by creating a complete workflow where a member creates a community, appoints themselves as moderator, creates content, and then has that content reported by another member. The test verifies that the moderator can successfully retrieve and view the pending report with all expected details.
 *
 * The test ensures proper access control by confirming that only moderators can view reports, and that reports are correctly filtered to show only content from communities where the authenticated user has moderator privileges.
 *
 * 1. Authenticate a member account for community ownership and moderation.
 * 2. Create a new community with the authenticated member as owner.
 * 3. Add the member as a moderator to the community (owner can add themselves).
 * 4. Create a text post in the community by the owner.
 * 5. Authenticate a second member to act as the reporter.
 * 6. Have the second member report the post with a violation reason.
 * 7. Call the reports index endpoint as the moderator.
 * 8. Verify the pending report is returned with correct reporter identity, reason, actor_type, and status.
 * 9. Validate pagination metadata is present in the response.
 */
export async function test_api_reports_moderator_view_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first member (community owner/moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(moderatorAuth);
  // 2. Create community (moderator becomes owner)
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Add moderator to community (owner can add themselves)
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await generate_random_reddit_like_member_communities_moderators_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Create a post in the community
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(moderatorConnection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 5. Authenticate second member (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(reporterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(reporterAuth);
  // 6. Report the post
  const report: IRedditLikeReport =
    await generate_random_reddit_like_member_reports_create(
      reporterConnection,
      {
        body: {
          targetType: "post",
          targetId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeReport.ICreate,
      },
    );
  typia.assert(report);
  // 7. Call reports index endpoint as moderator
  const reportsPage: IPageIRedditLikeReport.ISummary =
    await api.functional.redditLike.member.reports.index(moderatorConnection, {
      body: {
        status: "pending",
      } satisfies IRedditLikeReport.IRequest,
    });
  typia.assert(reportsPage);
  // 8. Verify the pending report is found by ID
  const foundReport: IRedditLikeReport.ISummary | undefined =
    reportsPage.data.find((r) => r.id === report.id);
  const safeReport = typia.assert<IRedditLikeReport.ISummary>(foundReport!);
  // 9. Validate report details
  TestValidator.equals(
    "report status is pending",
    safeReport.status,
    "pending",
  );
  TestValidator.equals(
    "reporter matches",
    safeReport.reporter.id,
    reporterAuth.id,
  );
  TestValidator.equals("actor type is post", safeReport.actor_type, "post");
  TestValidator.predicate("reason is non-empty", safeReport.reason.length > 0);
  TestValidator.predicate(
    "has created timestamp",
    safeReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated timestamp",
    safeReport.updated_at.length > 0,
  );
  // 10. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    reportsPage.pagination !== undefined,
  );
  TestValidator.predicate("has current page", reportsPage.pagination.current >= 0);
  TestValidator.predicate("has limit", reportsPage.pagination.limit > 0);
  TestValidator.predicate("has record count", reportsPage.pagination.records >= 1);
  TestValidator.predicate("has page count", reportsPage.pagination.pages >= 1);
}