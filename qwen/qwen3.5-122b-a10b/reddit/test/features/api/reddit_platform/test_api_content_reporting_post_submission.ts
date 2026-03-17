import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_content_reporting_post_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create reporter member account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporter);
  // 2. Create community (owner becomes moderator automatically)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      reporterConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create another member who will post content to be reported
  const posterConnection: api.IConnection = { host: connection.host };
  const poster = await authorize_member_join(posterConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(poster);
  // 4. Subscribe poster to community
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    posterConnection,
    {
      communityId: community.id,
    },
  );
  // 5. Create a post in the community that will be reported
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
  // 6. Submit a report on the post with violation reason
  const report = await generate_random_reddit_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason:
          "This post violates community guidelines by containing spam content",
        post_id: post.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Validate report creation
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("reporter matches", report.reporter.id, reporter.id);
  TestValidator.equals("target post matches", report.post?.id, post.id);
  TestValidator.equals("report has valid ID", typeof report.id, "string");
  TestValidator.predicate(
    "report has created timestamp",
    report.created_at !== null,
  );
  TestValidator.predicate(
    "report has updated timestamp",
    report.updated_at !== null,
  );
  TestValidator.predicate(
    "report reason is non-empty",
    report.reason.length > 0,
  );
}