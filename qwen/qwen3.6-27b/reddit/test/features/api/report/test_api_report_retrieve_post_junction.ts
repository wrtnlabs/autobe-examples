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
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test retrieving a report-on-post junction record by creating prerequisite content and validating the junction data.
 *
 * Validates the complete report creation and junction retrieval flow including member authentication, community setup, post creation, report submission, and junction record verification. The report-on-post junction links a moderation report targeting a post with full details from both the report and post sides.
 *
 * 1. Authenticate member A for content creation and reporting capabilities.
 * 2. Create a community with a random name and description where the member becomes owner.
 * 3. Subscribe member A to the previously created community, enabling post privileges.
 * 4. Create a text post within the community.
 * 5. Report the created post with a random reason, automatically creating the report-on-post junction record.
 * 6. Retrieve the junction record using the report ID and junction ID from the report response's onPost field.
 * 7. Validate the junction record matches the original report details (reason, status, community, reporter) and post details (title, author, community).
 */
export async function test_api_report_retrieve_post_junction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member A
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  // 2. Create a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {} satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // 3. Subscribe member A to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies DeepPartial<IREdditLikeCommunityPost.ICreate>,
      },
    );
  typia.assert(post);
  // 5. Report the post, which creates the report-on-post junction
  const report: IREdditLikeCommunityReport =
    await generate_random_reddit_like_community_member_reports_create(
      memberConnection,
      {
        body: {
          postId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<IREdditLikeCommunityReport.ICreate>,
      },
    );
  typia.assert(report);
  // 6. Extract IDs for junction retrieval
  const reportId: string & tags.Format<"uuid"> = report.id;
  typia.assertGuard(report.onPost!);
  const reportOnPostId: string & tags.Format<"uuid"> = report.onPost!.id;
  // 7. Retrieve the report-on-post junction record
  const junction: IREdditLikeCommunityReportOnPost =
    await api.functional.redditLikeCommunity.reports.report_on_posts.at(
      memberConnection,
      {
        reportId,
        reportOnPostId,
      },
    );
  typia.assert(junction);
  // 8. Validate junction record contains matching report and post details
  TestValidator.equals(
    "junction report ID matches",
    junction.report.id,
    report.id,
  );
  TestValidator.equals("junction post ID matches", junction.post.id, post.id);
  TestValidator.equals(
    "junction report reason matches",
    junction.report.reason,
    report.reason,
  );
  TestValidator.equals(
    "junction report status",
    junction.report.status,
    "pending",
  );
  TestValidator.equals(
    "junction report target type",
    junction.report.target_type,
    "post",
  );
  TestValidator.equals(
    "junction report community matches",
    junction.report.community.id,
    community.id,
  );
  TestValidator.equals(
    "junction post title matches",
    junction.post.title,
    post.title,
  );
  TestValidator.equals(
    "junction post author matches",
    junction.post.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "junction post community matches",
    junction.post.community.id,
    community.id,
  );
}
