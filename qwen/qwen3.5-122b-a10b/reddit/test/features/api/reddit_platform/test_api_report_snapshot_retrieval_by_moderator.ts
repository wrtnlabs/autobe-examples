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
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
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
 * Test moderator retrieval of report snapshot.
 * 1. Create community owner and authenticate
 * 2. Create community (owner auto-subscribed)
 * 3. Create reporter member and authenticate
 * 4. Subscribe reporter to community
 * 5. Owner creates a post in community
 * 6. Reporter submits a violation report on the post
 * 7. Assign owner as moderator
 * 8. Retrieve report snapshot and validate
 */
export async function test_api_report_snapshot_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community (owner auto-subscribed)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 4. Subscribe reporter to community
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    reporterConnection,
    {
      communityId: community.id,
    },
  );
  // 5. Owner creates a post in community
  const post = await generate_random_reddit_platform_member_posts_create(
    ownerConnection,
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
  // 6. Reporter submits a violation report on the post
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
  // 7. Assign owner as moderator
  await generate_random_reddit_platform_member_communities_moderators_create(
    ownerConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: ownerAuth.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 8. Retrieve report snapshot - use report ID as snapshot ID (single snapshot per report)
  const snapshot =
    await api.functional.redditPlatform.member.reports.snapshots.at(
      ownerConnection,
      {
        reportId: report.id,
        snapshotId: report.id,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot data
  TestValidator.equals("report ID matches", snapshot.report.id, report.id);
  TestValidator.predicate("has status", snapshot.status.length > 0);
  TestValidator.predicate(
    "has reason",
    snapshot.reason !== null && snapshot.reason !== undefined,
  );
  TestValidator.predicate(
    "has creation timestamp",
    snapshot.created_at.length > 0,
  );
}