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
 * Test moderator approval of content report resulting in post deletion.
 *
 * Validates the complete report resolution workflow where a community moderator approves a report filed against a post, resulting in the post being soft-deleted. This test ensures that the moderation system correctly handles report approval, records moderator actions, and enforces content removal.
 *
 * The test establishes three distinct user roles: community owner/moderator, content author, and reporter. Each role performs specific actions to create a realistic moderation scenario. The community owner automatically has moderator privileges as the creator of the community.
 *
 * 1. Community owner registers and creates a community.
 * 2. Content author registers and subscribes to the community.
 * 3. Content author creates a post in the community.
 * 4. Reporter registers and subscribes to the community.
 * 5. Reporter files a report against the post with a valid reason.
 * 6. Community owner (moderator) approves the report.
 * 7. Validates report status, resolved_by, resolved_at, and reported content reference.
 */
export async function test_api_report_resolution_by_moderator_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner/moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator);
  // 2. Create community owned by moderator
  const community =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Create content author account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(author);
  // 4. Subscribe author to community
  const authorSubscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(authorSubscription);
  // 5. Create post by author in the community
  const post = await generate_random_reddit_community_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 6. Create reporter account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporter);
  // 7. Subscribe reporter to community
  const reporterSubscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      reporterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(reporterSubscription);
  // 8. Submit report on the post
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
  // 9. Moderator approves the report
  const updatedReport =
    await api.functional.redditCommunity.member.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditCommunityReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 10. Validate report status changed to approved
  TestValidator.equals("report status", updatedReport.status, "approved");
  // 11. Validate resolved_by contains moderator's member ID
  TestValidator.equals(
    "resolved_by id",
    updatedReport.resolvedBy!.id,
    moderator.id,
  );
  // 12. Validate resolved_at timestamp is populated
  TestValidator.predicate(
    "resolved_at exists",
    updatedReport.resolved_at !== null &&
      updatedReport.resolved_at !== undefined,
  );
  // 13. Validate reportedContent references the original post
  TestValidator.equals(
    "reported content id",
    (updatedReport.reportedContent as IRedditCommunityPost.ISummary).id,
    post.id,
  );
}
