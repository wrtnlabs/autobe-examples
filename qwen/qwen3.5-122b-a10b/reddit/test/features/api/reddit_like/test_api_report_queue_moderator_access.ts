import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test that a community moderator can successfully access the report queue for their community.
 *
 * Validates the moderation workflow where a community owner can view reported content submitted by members. The test ensures that reports include complete information about the reporter, reported content, and reason for reporting.
 *
 * 1. First member joins the system and creates a community (becomes owner)
 * 2. First member creates a text post in their community
 * 3. Second member joins the system
 * 4. Second member reports the post with a violation reason
 * 5. First member accesses the report queue endpoint for their community
 * 6. Validates the response includes the report with reporter identity, reason, reported post details, and status
 * 7. Verifies pagination metadata is included in the response
 */
export async function test_api_report_queue_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (community owner) joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Owner creates a text post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    ownerConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 4. Second member (reporter) joins
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 5. Reporter creates a report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(report);
  // 6. Owner accesses the report queue for their community
  const reportQueue =
    await api.functional.redditLike.member.communities.reports.queue(
      ownerConnection,
      {
        communityCode: community.name,
      },
    );
  typia.assert(reportQueue);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination has current page",
    reportQueue.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    reportQueue.pagination.records > 0,
    true,
  );
  // 8. Validate report exists in queue
  TestValidator.equals(
    "has at least one report",
    reportQueue.data.length > 0,
    true,
  );
  const foundReport = reportQueue.data.find((r) => r.id === report.id);
  TestValidator.predicate("report found in queue", foundReport !== undefined);
  if (foundReport) {
    TestValidator.equals(
      "reporter matches",
      foundReport.reporter.id,
      reporterAuth.id,
    );
    TestValidator.predicate("has reason text", foundReport.reason.length > 0);
    TestValidator.equals("status is pending", foundReport.status, "pending");
  }
}
