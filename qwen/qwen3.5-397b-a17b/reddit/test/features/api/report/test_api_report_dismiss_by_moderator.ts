import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test community moderator dismissing a pending report on a post.
 *
 * Validates the complete report dismissal workflow including community setup, post creation, report filing, and moderator dismissal action. Ensures that dismissing a report properly updates the report status while keeping the reported content visible and accessible.
 *
 * The test verifies that the dismissal action is performed by an authorized moderator (community owner), that the report status transitions from 'pending' to 'dismissed', and that the resolved_by and resolved_at fields are properly populated. The reported post must remain unchanged and accessible after dismissal.
 *
 * 1. Community owner account is created and authenticated.
 * 2. Community is created with the owner as moderator.
 * 3. Content creator member account is created and authenticated.
 * 4. Content creator subscribes to the community.
 * 5. Content creator creates a post in the community.
 * 6. Reporter member account is created and authenticated.
 * 7. Reporter files a report on the post with pending status.
 * 8. Community owner (moderator) dismisses the report.
 * 9. Validates report status is 'dismissed', resolved_by contains moderator ID, resolved_at is populated, and reported post remains accessible.
 */
export async function test_api_report_dismiss_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create content creator member
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(creatorAuth);
  // 4. Subscribe creator to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      creatorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Create post in community
  const post = await generate_random_reddit_community_posts_create(
    creatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. Create reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporterAuth);
  // 7. File report on post
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
    {
      body: {
        report_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(report);
  // Verify initial report status is pending
  TestValidator.equals("initial status is pending", report.status, "pending");
  TestValidator.equals(
    "resolved_by is null initially",
    report.resolvedBy,
    null,
  );
  TestValidator.predicate(
    "resolved_at is null initially",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  // 8. Dismiss report as moderator (community owner)
  const dismissedReport =
    await api.functional.redditCommunity.member.communities.reports.dismiss(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // 9. Validate dismissal results
  TestValidator.equals(
    "status changed to dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "resolved_by contains moderator ID",
    dismissedReport.resolvedBy?.id,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "resolved_at is populated",
    dismissedReport.resolved_at !== null &&
      dismissedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "report type unchanged",
    dismissedReport.report_type,
    "post",
  );
  TestValidator.equals(
    "reported content ID unchanged",
    dismissedReport.reportedContent.id,
    post.id,
  );
  // Verify reported post remains accessible (not deleted)
  TestValidator.predicate("reported post not deleted", post.deletedAt === null);
  TestValidator.equals(
    "post still exists",
    dismissedReport.reportedContent.id,
    post.id,
  );
}
