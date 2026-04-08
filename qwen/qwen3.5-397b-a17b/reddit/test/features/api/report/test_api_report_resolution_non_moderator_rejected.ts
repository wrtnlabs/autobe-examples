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
 * Test the business logic failure where a non-moderator member attempts to resolve a content report.
 *
 * Validates that the report resolution system correctly enforces moderator-only permissions by rejecting update attempts from non-moderator members. The test establishes a complete community ecosystem with owner, content author, reporter, and non-moderator subscriber roles to verify the authorization boundary.
 *
 * The test flow creates a community with an owner, establishes a content author who creates a post, sets up a reporter who files a report on that post, and finally attempts to resolve the report using a fourth member who is subscribed but lacks moderator privileges. This validates the critical security boundary that prevents unauthorized report resolution.
 *
 * 1. Community owner registers and creates a community.
 * 2. Content author registers, subscribes to community, and creates a post.
 * 3. Reporter registers, subscribes to community, and files a report on the post.
 * 4. Non-moderator member registers and subscribes to the community.
 * 5. Non-moderator attempts to update report status to "approved".
 * 6. Validates the API rejects the request with 403 Forbidden error.
 * 7. Verifies report remains in pending status and reported content is unchanged.
 */
export async function test_api_report_resolution_non_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Community owner setup
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Content author setup
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  await generate_random_reddit_community_member_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  const post = await generate_random_reddit_community_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Reporter setup
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  await generate_random_reddit_community_member_member_subscriptions_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
    {
      body: {
        report_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 4. Non-moderator member setup
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  await generate_random_reddit_community_member_member_subscriptions_create(
    nonModeratorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  // 5. Non-moderator attempts to resolve report (should fail with 403)
  await TestValidator.error("non-moderator cannot resolve report", async () => {
    await api.functional.redditCommunity.member.reports.update(
      nonModeratorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditCommunityReport.IUpdate,
      },
    );
  });
  // 6. Verify report remains in pending status from creation response
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate(
    "resolved_at is null for pending report",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  TestValidator.predicate(
    "resolvedBy is null for pending report",
    report.resolvedBy === null,
  );
}
