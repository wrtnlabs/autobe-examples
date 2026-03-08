import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
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

/**
 * Test moderator viewing pending reports for their community.
 * 1. Create first member (moderator/community owner)
 * 2. Create community - owner becomes moderator
 * 3. Create second member (reporter)
 * 4. Second member subscribes to community
 * 5. Second member creates a post in the community
 * 6. Second member reports the post
 * 7. Moderator views pending reports
 * 8. Validate report contains correct information
 */
export async function test_api_report_moderator_view_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create community (owner becomes moderator automatically)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create reporter (second member)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 4. Reporter subscribes to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      reporterConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Reporter creates a post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    reporterConnection,
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
  // 6. Reporter creates a report for the post
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
  // 7. Moderator views pending reports for their community
  const reportsPage =
    await api.functional.redditPlatform.member.communities.reports.at(
      moderatorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(reportsPage);
  // 8. Validate response structure and content
  TestValidator.predicate(
    "has pagination",
    reportsPage.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(reportsPage.data));
  TestValidator.predicate(
    "has at least one report",
    reportsPage.data.length >= 1,
  );
  // Find our created report in the list
  const foundReport = reportsPage.data.find((r) => r.id === report.id);
  TestValidator.predicate("report exists in list", foundReport !== undefined);
  if (foundReport) {
    TestValidator.equals(
      "reporter username matches",
      foundReport.reporter.username,
      reporterAuth.username,
    );
    TestValidator.equals(
      "report status is pending",
      foundReport.status,
      "pending",
    );
    TestValidator.predicate("report has reason", foundReport.reason.length > 0);
    TestValidator.predicate(
      "report has created timestamp",
      foundReport.created_at !== undefined,
    );
    TestValidator.predicate(
      "report has post reference",
      foundReport.post !== null && foundReport.post !== undefined,
    );
    if (foundReport.post) {
      TestValidator.equals(
        "reported post title matches",
        foundReport.post.title,
        post.title,
      );
      TestValidator.equals(
        "reported post author matches",
        foundReport.post.author.username,
        reporterAuth.username,
      );
    }
  }
}