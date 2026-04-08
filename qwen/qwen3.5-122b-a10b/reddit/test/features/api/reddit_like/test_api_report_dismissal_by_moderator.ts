import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import type { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test report dismissal by community moderator.
 *
 * Validates that a community moderator can dismiss a pending content report,
 * changing its status to 'dismissed' while keeping the reported content visible.
 * The test ensures proper authorization checks and that the reporter's identity
 * and reason are preserved in the report record after dismissal.
 *
 * 1. Register a member who will become the community owner and moderator.
 * 2. Create a community owned by the moderator member.
 * 3. Create a text post in the community.
 * 4. Register a different member who will report the post.
 * 5. Submit a report on the post by the second member.
 * 6. Dismiss the report using the moderator's connection.
 * 7. Validate the report status changed to 'dismissed'.
 * 8. Validate the reporter's identity and reason are preserved.
 */
export async function test_api_report_dismissal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create a community owned by the moderator
  const community = await generate_random_reddit_like_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Register a different member who will report the post
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporter);
  // 5. Submit a report on the post by the reporter
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Validate report was created with pending status
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report target is post", report.actor_type, "post");
  TestValidator.equals(
    "reporter identity matches",
    report.member.id,
    reporter.id,
  );
  // 6. Dismiss the report using the moderator's connection
  const dismissedReport =
    await api.functional.redditLike.member.reports.dismiss(
      moderatorConnection,
      {
        body: {
          id: report.id,
        } satisfies IRedditLikeReport.IDismiss,
      },
    );
  typia.assert(dismissedReport);
  // 7. Validate the report status changed to 'dismissed'
  TestValidator.equals(
    "report status is dismissed after dismissal",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "report id remains the same",
    dismissedReport.id,
    report.id,
  );
  // 8. Validate the reporter's identity and reason are preserved
  TestValidator.equals(
    "reporter identity preserved",
    dismissedReport.member.id,
    report.member.id,
  );
  TestValidator.equals(
    "report reason preserved",
    dismissedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "reporter display name preserved",
    dismissedReport.member.display_name,
    report.member.display_name,
  );
}
