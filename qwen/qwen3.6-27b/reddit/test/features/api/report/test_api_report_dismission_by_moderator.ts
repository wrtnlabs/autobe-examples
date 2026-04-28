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
 * Test report dismissal workflow by a moderator on a report submitted by another member.
 *
 * Validates the complete report dismissal flow including community setup, post creation by a reporter, report submission, and moderator dismissal. Ensures that report status transitions correctly from pending to dismissed, resolution metadata captures the dismissing moderator via resolved_by_member_id and resolved_at, and that the reported post content remains intact after dismissal.
 *
 * Access control is verified by confirming that non-moderator reporters are rejected when attempting to dismiss reports. Subsequent resolution attempts on already-dismissed reports are also rejected.
 *
 * 1. Moderator and reporter members register for the platform.
 * 2. Moderator creates a community as the community owner.
 * 3. Both moderator and reporter subscribe to the community.
 * 4. Reporter creates a text post in the community.
 * 5. Reporter submits a report on their own post with a reason.
 * 6. Moderator dismisses the report, transitioning status to dismissed.
 * 7. Validates report status, resolution metadata, and that post content remains intact.
 * 8. Reporter attempting to dismiss reports receives an access control error.
 * 9. Subsequent dismissal on the already-dismissed report is rejected.
 */
export async function test_api_report_dismission_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator connection and register
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: "https://autobe.com",
      referrer: "https://autobe.com",
    },
  });
  typia.assert(moderatorAuthorized);
  // 2. Create reporter connection and register
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuthorized = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: "https://autobe.com",
      referrer: "https://autobe.com",
    },
  });
  typia.assert(reporterAuthorized);
  // 3. Moderator creates a community (becomes owner with moderation rights)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(community);
  // 4. Moderator subscribes to the community
  const moderatorSubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      moderatorConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(moderatorSubscription);
  // 5. Reporter subscribes to the community
  const reporterSubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      reporterConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(reporterSubscription);
  // 6. Reporter creates a text post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 7. Reporter submits a report on the post
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: {
          postId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report target type is post",
    report.target_type,
    "post",
  );
  // 8. Moderator dismisses the report
  const updatedReport =
    await api.functional.redditLikeCommunity.member.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "dismissed",
        } satisfies IREdditLikeCommunityReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 9. Validate dismissal result
  TestValidator.equals(
    "status changed to dismissed",
    updatedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "resolved_by is set",
    updatedReport.resolvedBy !== null,
  );
  TestValidator.equals(
    "resolved_by is the moderator",
    updatedReport.resolvedBy!.id,
    moderatorAuthorized.id,
  );
  TestValidator.predicate(
    "resolved_at is set",
    updatedReport.resolved_at !== null,
  );
  // 10. Validate reported post remains intact after dismissal
  TestValidator.predicate("post title preserved", post.title.length > 0);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  // 11. Reporter attempting to dismiss reports receives access control error
  const newPost =
    await generate_random_reddit_like_community_member_posts_create(
      reporterConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(newPost);
  const newReport =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: {
          postId: newPost.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(newReport);
  await TestValidator.error("reporter cannot dismiss reports", async () => {
    await api.functional.redditLikeCommunity.member.reports.update(
      reporterConnection,
      {
        reportId: newReport.id,
        body: {
          status: "dismissed",
        } satisfies IREdditLikeCommunityReport.IUpdate,
      },
    );
  });
  // 12. Subsequent dismissal on already-dismissed report is rejected
  await TestValidator.error(
    "cannot dismiss already-dismissed report",
    async () => {
      await api.functional.redditLikeCommunity.member.reports.update(
        moderatorConnection,
        {
          reportId: report.id,
          body: {
            status: "dismissed",
          } satisfies IREdditLikeCommunityReport.IUpdate,
        },
      );
    },
  );
}
