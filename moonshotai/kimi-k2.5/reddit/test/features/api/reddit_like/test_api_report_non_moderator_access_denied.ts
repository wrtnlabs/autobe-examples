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

/**
 * Test that non-moderator members are denied access when attempting to update report status.
 *
 * Scenario:
 * 1. Member1 creates a community
 * 2. Member1 subscribes and creates a post
 * 3. Member2 (reporter) subscribes to the community
 * 4. Member2 creates a report on the post
 * 5. Member2 attempts to update the report status via moderator endpoint
 * 6. Verify that 403 Forbidden is returned
 */
export async function test_api_report_non_moderator_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member1 (community creator)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // 2. Create community as member1
  const community = await generate_random_reddit_like_member_communities_create(
    member1Connection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe member1 to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    member1Connection,
    {
      communityId: community.id,
    },
  );
  // 4. Create post as member1
  const post = await generate_random_reddit_like_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        title: "Test post for report",
        body: "This is test content for the report",
      },
    },
  );
  typia.assert(post);
  // 5. Create and authenticate member2 (reporter)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 6. Subscribe member2 to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    member2Connection,
    {
      communityId: community.id,
    },
  );
  // 7. Create report as member2
  const report = await generate_random_reddit_like_member_reports_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
        reason: "Inappropriate content test",
        postId: post.id,
        commentId: null,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Verify initial status is pending
  TestValidator.equals("initial report status", report.status, "pending");
  // 8. Attempt to update report status as non-moderator - should fail with 403
  await TestValidator.httpError(
    "non-moderator should get 403 when updating report",
    403,
    async () => {
      await api.functional.redditLike.moderator.reports.update(
        member2Connection,
        {
          reportId: report.id,
          body: {
            status: "approved",
          } satisfies IRedditLikeReport.IUpdate,
        },
      );
    },
  );
}
