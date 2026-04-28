import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test community moderator retrieves details of a pending report filed against a comment.
 *
 * Validates the complete report retrieval flow including multiple actor authentication, community creation, post and comment creation, report filing, and report detail retrieval. Ensures that the report correctly reflects the comment target type, pending status, null post junction, populated comment junction, and accurate reporter identity and reason text.
 *
 * 1. Owner authenticates as community creator and moderator.
 * 2. Author authenticates as content creator.
 * 3. Reporter authenticates as content reporter.
 * 4. Owner creates the community.
 * 5. Author subscribes to the community.
 * 6. Author creates a post.
 * 7. Author writes a comment on the post.
 * 8. Reporter files a report against the comment.
 * 9. Moderator retrieves the report details.
 * 10. Validates report fields match expected values.
 */
export async function test_api_report_view_comment_target_details(
  connection: api.IConnection,
) {
  // 1. Owner (moderator) authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. Author authentication
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuthorized = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(authorAuthorized);
  // 3. Reporter authentication
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuthorized = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(reporterAuthorized);
  // 4. Owner creates the community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 5. Author subscribes to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 6. Author creates a post
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(post);
  // 7. Author writes a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 8. Reporter files a report against the comment
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: {
          commentId: comment.id,
          reason: reportReason,
        } satisfies IREdditLikeCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 9. Moderator retrieves the report details
  const reportDetails = await api.functional.redditLikeCommunity.reports.at(
    ownerConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(reportDetails);
  // 10. Validate report fields
  TestValidator.equals(
    "report status is pending",
    reportDetails.status,
    "pending",
  );
  TestValidator.equals(
    "report target_type is comment",
    reportDetails.target_type,
    "comment",
  );
  TestValidator.equals(
    "report onPost junction is null",
    reportDetails.onPost,
    null,
  );
  TestValidator.predicate(
    "report reportOnComment junction is populated",
    reportDetails.reportOnComment !== null,
  );
  TestValidator.equals(
    "report reason matches input",
    reportDetails.reason,
    reportReason,
  );
  TestValidator.equals(
    "report reporter identity matches reporter",
    reportDetails.reportedBy.id,
    reporterAuthorized.id,
  );
}
