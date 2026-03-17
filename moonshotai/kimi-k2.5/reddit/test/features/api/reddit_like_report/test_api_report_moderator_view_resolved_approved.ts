import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_moderator_view_resolved_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator and get their assigned community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderator);
  const community = moderator.community;
  // Step 2: Create member (reporter)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 3: Subscribe member to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // Step 4: Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph(),
        body: RandomGenerator.paragraph(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Submit a report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postId: post.id,
        commentId: null,
        reason: RandomGenerator.paragraph(),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  // Step 6: Approve the report as moderator
  const approvedReport =
    await api.functional.redditLike.moderator.reports.approve(
      moderatorConnection,
      { reportId: report.id },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "approved report status is approved",
    approvedReport.status,
    "approved",
  );
  // Step 7: View the resolved report as moderator
  const viewedReport = await api.functional.redditLike.moderator.reports.at(
    moderatorConnection,
    { reportId: report.id },
  );
  typia.assert(viewedReport);
  // Step 8: Validate report shows approved status with audit trail
  TestValidator.equals(
    "viewed report status is approved",
    viewedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "report has audit trail snapshots",
    viewedReport.snapshots.length > 0,
  );
  const latestSnapshot = viewedReport.snapshots[0];
  typia.assert(latestSnapshot);
  TestValidator.equals(
    "latest snapshot shows approved status",
    latestSnapshot.status,
    "approved",
  );
  TestValidator.predicate(
    "reported content is marked as deleted",
    viewedReport.content.isDeleted === true,
  );
  TestValidator.equals(
    "report content id matches original post",
    viewedReport.content.id,
    post.id,
  );
}