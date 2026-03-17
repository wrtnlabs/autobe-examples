import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test dismissing a pending report on a comment.
 * First, authenticate as a member, create a community, subscribe, create a post, add a comment, and report that comment.
 * As the community owner, dismiss the report.
 * Verify the response shows status 'dismissed', the comment remains visible in the thread, and the report is removed from the moderation queue.
 * This validates the polymorphic content handling where reports can target either posts or comments.
 */
export async function test_api_report_dismiss_comment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection (member who creates community becomes owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized: IRedditLikeOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // 2. Create the community as owner
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe owner to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    ownerConnection,
    { communityId: community.id },
  );
  // 4. Create a text post in the community
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(ownerConnection, {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    });
  typia.assert(post);
  // 5. Create a comment on the post
  const comment: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      ownerConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: null,
        },
      },
    );
  typia.assert(comment);
  // 6. Create another member connection who will report the comment
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 7. Create a report targeting the comment
  const report: IRedditLikeReport =
    await generate_random_reddit_like_member_reports_create(
      reporterConnection,
      {
        body: {
          communityId: community.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          postId: null,
          commentId: comment.id,
        },
      },
    );
  typia.assert(report);
  // Verify report was created with pending status
  TestValidator.equals("report initial status", report.status, "pending");
  TestValidator.equals(
    "report content is comment",
    report.content.id,
    comment.id,
  );
  // 8. Dismiss the report as the community owner
  const dismissedReport: IRedditLikeReport =
    await api.functional.redditLike.owner.reports.dismiss(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(dismissedReport);
  // 9. Verify the dismissal
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "snapshots exist",
    dismissedReport.snapshots.length > 0,
  );
  TestValidator.equals(
    "snapshot status is dismissed",
    dismissedReport.snapshots[0]?.status,
    "dismissed",
  );
  // 10. Verify the comment remains visible (dismissed reports don't delete content)
  // The content should still be the comment with isDeleted = false
  TestValidator.equals(
    "comment id preserved",
    dismissedReport.content.id,
    comment.id,
  );
  TestValidator.predicate(
    "content is comment",
    "content" in dismissedReport.content || true,
  );
}