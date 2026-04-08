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
 * Test that a moderator can retrieve a report that has been approved (status changed).
 *
 * Validates the complete reporting and moderation workflow including moderator registration, community retrieval, member subscription, post creation, report submission, report approval, and final report retrieval. Ensures that approved reports maintain their status and metadata correctly.
 *
 * Special attention is given to verifying that the report status is correctly updated to 'approved' after moderator action, and that the deleted_at field remains null for approved reports (only dismissed reports are soft-deleted).
 *
 * 1. Moderator registers and authenticates via join operation.
 * 2. Retrieves an existing community from the platform.
 * 3. Assigns moderator to the community as owner.
 * 4. First member registers and authenticates.
 * 5. First member subscribes to the community.
 * 6. First member creates a post in the community.
 * 7. Second member registers and authenticates.
 * 8. Second member reports the post with a reason.
 * 9. Moderator approves the report (deletes the reported content).
 * 10. Moderator retrieves the approved report by ID.
 * 11. Validates report details: status is 'approved', deleted_at is null, report_type is 'post', reason text is preserved, reporter information is included, and reportedPost details may be available or null after deletion.
 */
export async function test_api_report_retrieve_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {});
  // 2. Retrieve an existing community
  const communities = await api.functional.redditClone.communities.index(
    moderatorConnection,
    { body: {} satisfies IRedditCloneCommunity.IRequest },
  );
  typia.assert(communities);
  if (communities.data.length === 0) {
    throw new Error(
      "No communities available for testing. Please create a community first.",
    );
  }
  const community = communities.data[0];
  // 3. Assign moderator to the community as owner using the userProfileId from authorization
  const moderatorAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          userProfileId: moderatorAuth.reddit_clone_user_profile_id,
          role: "owner",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 4. First member registration and authentication
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // 5. First member subscribes to the community
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    member1Connection,
    {
      params: { communityId: community.id },
    },
  );
  // 6. First member creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 7. Second member registration and authentication
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 8. Second member reports the post
  const report = await generate_random_reddit_clone_member_reports_create(
    member2Connection,
    {
      body: {
        report_type: "post",
        post_id: post.id,
        reason: "This post violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // 9. Moderator approves the report (deletes the reported content)
  const approvedReport =
    await api.functional.redditClone.moderator.reports.approve(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 10. Moderator retrieves the approved report by ID
  const retrievedReport = await api.functional.redditClone.moderator.reports.at(
    moderatorConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 11. Validate report details
  TestValidator.equals(
    "report status is approved",
    retrievedReport.status,
    "approved",
  );
  TestValidator.equals(
    "report type is post",
    retrievedReport.report_type,
    "post",
  );
  TestValidator.predicate(
    "reason is preserved",
    retrievedReport.reason.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for approved reports",
    retrievedReport.deleted_at,
    null,
  );
  TestValidator.predicate(
    "reporter information is included",
    retrievedReport.reporter.id !== undefined,
  );
  TestValidator.predicate(
    "reported post details are available or null",
    retrievedReport.reportedPost !== undefined,
  );
  if (retrievedReport.reportedPost !== null) {
    TestValidator.equals(
      "reported post ID matches",
      retrievedReport.reportedPost.id,
      post.id,
    );
  }
}
