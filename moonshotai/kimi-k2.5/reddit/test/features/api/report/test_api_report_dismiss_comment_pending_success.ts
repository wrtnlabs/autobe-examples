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
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_dismiss_comment_pending_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Authenticate as content creator (member)
  const creatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(creatorConnection, {});
  // 3. Creator creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    creatorConnection,
    { body: {} },
  );
  typia.assert(community);
  // 4. Creator subscribes to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      creatorConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 5. Creator creates a text post
  const post = await generate_random_reddit_like_member_posts_create(
    creatorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Creator creates a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      creatorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  const originalCommentContent = comment.content;
  // 7. Authenticate as reporter (different member)
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 8. Reporter creates a report on the comment
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        postId: null,
        commentId: comment.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 9. Verify report has pending status
  TestValidator.equals("report status is pending", report.status, "pending");
  // 10. Moderator dismisses the report
  const dismissedReport =
    await api.functional.redditLike.moderator.reports.dismiss(
      moderatorConnection,
      { reportId: report.id },
    );
  typia.assert(dismissedReport);
  // Validations:
  // - Report status should be dismissed
  TestValidator.equals(
    "report status after dismissal",
    dismissedReport.status,
    "dismissed",
  );
  // - Snapshots should exist documenting the status change
  TestValidator.predicate(
    "report has snapshots",
    dismissedReport.snapshots.length > 0,
  );
  // - The comment content should remain visible and unchanged
  TestValidator.equals(
    "comment content unchanged after dismissal",
    report.content.content,
    originalCommentContent,
  );
}
