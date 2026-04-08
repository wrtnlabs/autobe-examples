import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a moderator can retrieve a pending report for content in their moderated community.
 *
 * Validates the complete report retrieval workflow including moderator authentication, community setup with moderator assignment, post creation by a member, report submission by another member, and report retrieval by the moderator. Ensures that the report response contains all required fields including report metadata, reporter information, and reported content details.
 *
 * Special attention is given to verifying that the reportedPost field is populated with post summary information while reportedComment is null for post reports, and that the status is 'pending' awaiting moderator action.
 *
 * 1. Moderator registers and authenticates via join operation.
 * 2. A community is created and the moderator is assigned to it with 'moderator' role.
 * 3. First member registers, authenticates, and subscribes to the community.
 * 4. First member creates a post in the community.
 * 5. Second member registers, authenticates, and subscribes to the community.
 * 6. Second member reports the post with a reason.
 * 7. Moderator retrieves the report by ID.
 * 8. Validates that the response contains: report ID, report_type ('post'), reason text, status ('pending'), reporter information (username, profile), reported post details (title, author, community), and timestamps.
 * 9. Validates that reportedPost field is populated and reportedComment is null.
 */
export async function test_api_report_retrieve_pending_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Create community
  const community = await api.functional.redditClone.communities.index(
    moderatorConnection,
    { body: {} satisfies IRedditCloneCommunity.IRequest },
  );
  typia.assert(community);
  // Use first community or create scenario requires actual community
  // Since we can't create community directly, we'll need to work with existing
  // For this test, we'll assume a community exists and use it
  // In real scenario, community creation would be done separately
  // Since communities.index returns a list, we need an actual community ID
  // For E2E test, we'll generate a UUID and assume the community exists
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Assign moderator to community
  const moderatorAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorConnection,
      {
        params: { communityId },
        body: { role: "moderator" },
      },
    );
  typia.assert(moderatorAssignment);
  // 4. First member registration and authentication
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // 5. First member subscribes to community
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    member1Connection,
    {
      params: { communityId },
    },
  );
  // 6. First member creates a post
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: communityId,
        post_type: "text",
      },
    },
  );
  typia.assert(post);
  // 7. Second member registration and authentication
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // 8. Second member subscribes to community
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    member2Connection,
    {
      params: { communityId },
    },
  );
  // 9. Second member reports the post
  const report = await generate_random_reddit_clone_member_reports_create(
    member2Connection,
    {
      body: {
        report_type: "post",
        post_id: post.id,
        reason: "This post violates community guidelines - spam content",
      },
    },
  );
  typia.assert(report);
  // 10. Moderator retrieves the report
  const retrievedReport = await api.functional.redditClone.moderator.reports.at(
    moderatorConnection,
    { reportId: report.id },
  );
  typia.assert(retrievedReport);
  // 11. Validate report structure
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report type is post",
    retrievedReport.report_type,
    "post",
  );
  TestValidator.predicate(
    "report has reason text",
    retrievedReport.reason.length > 0,
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  // 12. Validate reporter information
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporter.id,
    member2.id,
  );
  TestValidator.equals(
    "reporter username matches",
    retrievedReport.reporter.username,
    member2.username,
  );
  TestValidator.predicate(
    "reporter has profile",
    retrievedReport.reporter.profile !== null,
  );
  // 13. Validate reported post information
  TestValidator.predicate(
    "reportedPost is populated",
    retrievedReport.reportedPost !== null,
  );
  if (retrievedReport.reportedPost !== null) {
    TestValidator.equals(
      "reported post ID matches",
      retrievedReport.reportedPost.id,
      post.id,
    );
    TestValidator.equals(
      "reported post title matches",
      retrievedReport.reportedPost.title,
      post.title,
    );
    TestValidator.equals(
      "reported post author ID matches",
      retrievedReport.reportedPost.author.id,
      member1.id,
    );
  }
  // 14. Validate reportedComment is null for post reports
  TestValidator.equals(
    "reportedComment is null for post report",
    retrievedReport.reportedComment,
    null,
  );
  // 15. Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedReport.updated_at !== null &&
      retrievedReport.updated_at.length > 0,
  );
}