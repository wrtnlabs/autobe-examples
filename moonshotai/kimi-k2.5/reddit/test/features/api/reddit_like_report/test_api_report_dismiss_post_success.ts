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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_dismiss_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member who will become community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create community (owner is automatically assigned)
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to community to enable post creation
  await api.functional.redditLike.member.communities.subscriptions.create(
    ownerConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create text post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create second member who will submit the report
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 6. Subscribe reporter to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    reporterConnection,
    {
      communityId: community.id,
    },
  );
  // 7. Create report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        reason: "Violation of community guidelines",
        postId: post.id,
        commentId: null,
      },
    },
  );
  typia.assert(report);
  // Verify initial state
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  // 8. Dismiss the report as community owner
  const dismissedReport = await api.functional.redditLike.owner.reports.dismiss(
    ownerConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(dismissedReport);
  // 9. Verify dismissal results
  TestValidator.equals(
    "report status changed to dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "snapshots array exists with status transition record",
    dismissedReport.snapshots.length > 0,
  );
  TestValidator.predicate(
    "snapshots contain dismissed status",
    dismissedReport.snapshots.some((s) => s.status === "dismissed"),
  );
  // Verify the reported content is the post and remains visible
  const reportedPost = dismissedReport.content as IRedditLikePost;
  TestValidator.equals("reported post id matches", reportedPost.id, post.id);
  TestValidator.predicate("post is not deleted", !reportedPost.isDeleted);
}
