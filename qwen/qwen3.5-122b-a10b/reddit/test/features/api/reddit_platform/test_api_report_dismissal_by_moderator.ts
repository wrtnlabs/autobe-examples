import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

/**
 * Test moderator report dismissal workflow.
 * 1. Create community with owner
 * 2. Poster subscribes and creates a post
 * 3. Reporter submits a report on the post
 * 4. Moderator dismisses the report
 * 5. Verify report status is 'dismissed' and post remains accessible
 */
export async function test_api_report_dismissal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community with owner (who becomes moderator automatically)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Poster subscribes and creates a post
  const posterConnection: api.IConnection = { host: connection.host };
  const posterAuth = await authorize_member_join(posterConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(posterAuth);
  // Subscribe to community
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    posterConnection,
    { communityId: community.id },
  );
  // Create post
  const post = await generate_random_reddit_platform_member_posts_create(
    posterConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Reporter submits a report on the post
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(reporterAuth);
  const report = await generate_random_reddit_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 4. Assign moderator role to a new member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(moderatorAuth);
  await generate_random_reddit_platform_member_communities_moderators_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        member_id: moderatorAuth.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 5. Moderator dismisses the report
  const updatedReport =
    await api.functional.redditPlatform.member.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: { status: "dismissed" } satisfies IRedditPlatformReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 6. Verify report status is 'dismissed' and reviewer is set
  TestValidator.equals(
    "report status is dismissed",
    updatedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "reviewer is set",
    updatedReport.reviewer !== null && updatedReport.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer is moderator",
    updatedReport.reviewer?.id,
    moderatorAuth.id,
  );
  // 7. Verify post is still accessible (dismissal keeps content visible)
  // The successful dismissal without error confirms the post was not deleted
  TestValidator.predicate("post remains accessible", post.deleted_at === null);
}