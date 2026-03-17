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

export async function test_api_report_dismiss_unauthorized_moderator_failure(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connections for each actor
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Join as Moderator A (will be legitimate moderator for Community A)
  const moderatorA = await authorize_moderator_join(moderatorAConnection, {});
  typia.assert(moderatorA);
  // 2. Join as Moderator B (will attempt unauthorized dismissal)
  const moderatorB = await authorize_moderator_join(moderatorBConnection, {});
  typia.assert(moderatorB);
  // 3. Join as Member (content creator and reporter)
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 4. Create Community A
  const communityA =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityA);
  // 5. Create Community B
  const communityB =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityB);
  // 6. Member subscribes to Community A (required for posting)
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: communityA.id,
      },
    );
  typia.assert(subscription);
  // 7. Member creates a text post in Community A
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityA.id,
        title: "Test post for unauthorized dismissal test",
        post_type: "text",
        body: "This is test content for the report",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 8. Member submits a report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        communityId: communityA.id,
        reason: "Test violation reason for unauthorized dismissal test",
        postId: post.id,
        commentId: null,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Verify report is initially pending
  TestValidator.equals(
    "initial report status should be pending",
    report.status,
    "pending",
  );
  // 9. Moderator B attempts to dismiss the report - should fail with authorization error
  await TestValidator.error(
    "unauthorized moderator dismissal should fail",
    async () => {
      await api.functional.redditLike.moderator.reports.dismiss(
        moderatorBConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
