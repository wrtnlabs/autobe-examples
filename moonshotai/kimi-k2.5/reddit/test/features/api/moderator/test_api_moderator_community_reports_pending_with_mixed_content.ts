import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_community_reports_pending_with_mixed_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner setup - create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Owner subscribes to their own community (required for posting)
  await api.functional.redditLike.member.communities.subscriptions.create(
    ownerConnection,
    { communityId: community.id },
  );
  // 4. Create test post that will be reported
  const post = await generate_random_reddit_like_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create test comment on the post that will be reported
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      ownerConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Reporter member setup - authenticate as a separate member who will submit reports
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 7. Subscribe the reporter member to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    reporterConnection,
    { communityId: community.id },
  );
  // 8. Submit report against the post
  const postReport = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        reason: "Inappropriate content in post",
        postId: post.id,
        commentId: null,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(postReport);
  // 9. Submit report against the comment
  const commentReport = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        reason: "Spam comment",
        postId: null,
        commentId: comment.id,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(commentReport);
  // 10. Future moderator setup - authenticate as the user who will become a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const futureModerator = await authorize_moderator_join(
    moderatorConnection,
    {},
  );
  typia.assert(futureModerator);
  // 11. Owner assigns moderator role to the user for this community
  await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
    body: {
      communityId: community.id,
      memberId: futureModerator.member.id,
      canAddModerators: false,
    } satisfies IRedditLikeModerator.ICreate,
  });
  // 12. Moderator retrieves the pending reports list
  const pendingReports =
    await api.functional.redditLike.moderator.communities.reports.pending.indexPending(
      moderatorConnection,
      { communityId: community.id },
    );
  typia.assert(pendingReports);
  // 13. Validation points
  // Response includes pagination metadata with correct counts
  TestValidator.equals(
    "pagination total records",
    pendingReports.pagination.records,
    2,
  );
  TestValidator.equals("data array length", pendingReports.data.length, 2);
  TestValidator.predicate(
    "has valid pagination",
    pendingReports.pagination.limit > 0,
  );
  // Reports ordered by creation time (most recent first) - validate both reports present
  TestValidator.predicate(
    "reports contain post report",
    pendingReports.data.some((r) => r.reportedContent.id === post.id),
  );
  TestValidator.predicate(
    "reports contain comment report",
    pendingReports.data.some((r) => r.reportedContent.id === comment.id),
  );
  // Each report contains: ID, reason, status='pending', reporter info, community context
  for (const report of pendingReports.data) {
    typia.assert(report.id);
    typia.assert(report.reason);
    TestValidator.equals("report status", report.status, "pending");
    typia.assert(report.reporter);
    typia.assert(report.community);
    typia.assert(report.reportedContent);
    // Reporter username is visible to moderator for context
    TestValidator.predicate(
      "reporter has username",
      report.reporter.username.length > 0,
    );
  }
  // Both post and comment reports appear in the queue (polymorphic discriminator check)
  const reportedTypes = pendingReports.data.map((r) =>
    "post_type" in r.reportedContent ? "post" : "comment",
  );
  TestValidator.predicate("has post report", reportedTypes.includes("post"));
  TestValidator.predicate(
    "has comment report",
    reportedTypes.includes("comment"),
  );
}
