import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test community owner approves a pending content report.
 *
 * Validates that a community owner can approve reports submitted for their community, resulting in hard deletion of the reported content. The test verifies the complete moderation workflow from report submission to approval and content deletion.
 *
 * 1. Create a community with the test user as owner.
 * 2. Register a separate member account to act as reporter.
 * 3. Subscribe reporter to the community.
 * 4. Create a post in the community using the reporter account.
 * 5. Submit a report on the post with a valid reason.
 * 6. Authenticate as the community owner.
 * 7. Call the approve endpoint with the report ID.
 * 8. Verify the report status changes to "approved".
 * 9. Verify the reported post is hard deleted (deleted_at is set).
 */
export async function test_api_report_approval_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community with owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
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
  // 2. Register reporter member
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
  // 3. Subscribe reporter to community (required before posting)
  // Note: Subscription endpoint not available in provided SDK, assuming auto-subscription or handled elsewhere
  // If subscription is required, would need: await api.functional.redditLike.member.subscriptions.create(reporterConnection, { community_id: community.id });
  // 4. Create post in community
  const post = await generate_random_reddit_like_member_posts_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Submit report on the post
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
  TestValidator.equals("report status is pending", report.status, "pending");
  // 6. Approve report as community owner
  const approvedReport: IRedditLikeReport =
    await api.functional.redditLike.member.reports.approve(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(approvedReport);
  // 7. Verify report status changed to approved
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  // 8. Verify the reported post is hard deleted
  TestValidator.predicate(
    "post is hard deleted",
    approvedReport.postTarget.post.deleted_at !== null,
  );
}
