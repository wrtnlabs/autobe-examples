import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_moderator_approve_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create content creator member
  const creatorConnection: api.IConnection = { host: connection.host };
  const creator = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(creator);
  // 2. Create community as content creator
  const community = await generate_random_reddit_like_member_communities_create(
    creatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to community (as creator)
  await api.functional.redditLike.member.communities.subscriptions.create(
    creatorConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create post in community
  const post = await generate_random_reddit_like_member_posts_create(
    creatorConnection,
    {
      body: {
        title: RandomGenerator.name(),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create reporter member (different from creator)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporter);
  // 6. Create report targeting the post
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        postId: post.id,
        commentId: null,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Record original updated_at for comparison
  const originalUpdatedAt = report.updatedAt;
  // 7. Create moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 8. Approve the report
  const approvedReport =
    await api.functional.redditLike.moderator.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditLikeReport.IUpdate,
      },
    );
  typia.assert(approvedReport);
  // Validations
  // Check status is approved
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  // Check updated_at is different (updated)
  TestValidator.notEquals(
    "updated_at changed after approval",
    approvedReport.updatedAt,
    originalUpdatedAt,
  );
  // Check report has snapshots
  TestValidator.predicate(
    "report has snapshots",
    approvedReport.snapshots.length > 0,
  );
  // Check snapshots contain approved status
  const hasApprovedSnapshot = approvedReport.snapshots.some(
    (s) => s.status === "approved",
  );
  TestValidator.predicate(
    "snapshots contain approved status",
    hasApprovedSnapshot,
  );
  // Check report contains reporter, community, and content
  typia.assert(approvedReport.reporter);
  typia.assert(approvedReport.community);
  typia.assert(approvedReport.content);
  // Verify reporter matches original reporter
  TestValidator.equals(
    "reporter id matches",
    approvedReport.reporter.id,
    reporter.id,
  );
  // Verify community matches
  TestValidator.equals(
    "community id matches",
    approvedReport.community.id,
    community.id,
  );
  // Verify content (post) matches
  TestValidator.equals(
    "content id matches",
    approvedReport.content.id,
    post.id,
  );
}
