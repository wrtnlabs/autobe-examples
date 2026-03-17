import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_report_moderator_approve_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner setup - create owner and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community as owner
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Owner subscribes to community (needed for posting)
  await api.functional.redditLike.member.communities.subscriptions.create(
    ownerConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Owner creates a post
  const post = await generate_random_reddit_like_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Owner creates a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      ownerConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Create reporter member and authenticate
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 7. Reporter member subscribes to the community (needed for reporting)
  await api.functional.redditLike.member.communities.subscriptions.create(
    reporterConnection,
    {
      communityId: community.id,
    },
  );
  // 8. Reporter member creates a report targeting the comment
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        reason: "This comment violates community guidelines",
        postId: null,
        commentId: comment.id,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Verify report was created with pending status
  TestValidator.equals("report initial status", report.status, "pending");
  // 9. Create a moderator user (joins as moderator actor)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 10. Owner adds the moderator to the community
  const communityModerator =
    await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
      body: {
        communityId: community.id,
        memberId: moderator.member.id,
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(communityModerator);
  // 11. Moderator approves the report
  const approvedReport =
    await api.functional.redditLike.moderator.reports.approve(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 12. Validate report status is approved
  TestValidator.equals(
    "report approved status",
    approvedReport.status,
    "approved",
  );
  // 13. Validate the content (comment) is deleted and matches the original comment
  TestValidator.equals(
    "report content ID matches comment",
    approvedReport.content.id,
    comment.id,
  );
  TestValidator.predicate(
    "comment is deleted",
    approvedReport.content.isDeleted,
  );
  // 14. Validate snapshots contain the resolution
  TestValidator.predicate(
    "report has resolution snapshots",
    approvedReport.snapshots.length > 0,
  );
  TestValidator.equals(
    "last snapshot status is approved",
    approvedReport.snapshots[0]?.status,
    "approved",
  );
  // 15. Verify the parent post is still accessible (not deleted)
  // Since we reported a comment, the content is IRedditLikeComment which has postId
  const reportContent = typia.assert<IRedditLikeComment>(report.content);
  TestValidator.equals(
    "parent post still exists",
    reportContent.postId,
    post.id,
  );
  // Note: The post should remain accessible since only comment was reported
}