import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
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

export async function test_api_moderator_community_reports_pending_posts_only(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create creator member
  const creatorConnection: api.IConnection = { host: connection.host };
  const creator: IRedditLikeMember.IAuthorized = await authorize_member_join(
    creatorConnection,
    { body: {} },
  );
  // Step 2: Creator creates a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      creatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // Step 3: Creator subscribes to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    creatorConnection,
    {
      communityId: community.id,
    },
  );
  // Step 4: Creator creates multiple posts
  const post1: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(creatorConnection, {
      body: {
        title: RandomGenerator.name(),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    });
  const post2: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(creatorConnection, {
      body: {
        title: RandomGenerator.name(),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    });
  // Step 5: Create reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, { body: {} });
  // Step 6: Reporter subscribes to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    reporterConnection,
    {
      communityId: community.id,
    },
  );
  // Step 7: Reporter submits reports against posts
  const report1: IRedditLikeReport =
    await generate_random_reddit_like_member_reports_create(
      reporterConnection,
      {
        body: {
          communityId: community.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          postId: post1.id,
          commentId: null,
        },
      },
    );
  const report2: IRedditLikeReport =
    await generate_random_reddit_like_member_reports_create(
      reporterConnection,
      {
        body: {
          communityId: community.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          postId: post2.id,
          commentId: null,
        },
      },
    );
  // Step 8: Create moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, { body: {} });
  // Step 9: Moderator retrieves pending reports
  const pendingReports: IPageIRedditLikeReport.ISummary =
    await api.functional.redditLike.moderator.communities.reports.pending.indexPending(
      moderatorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(pendingReports);
  // Step 10: Validate response
  // Validate pagination metadata
  TestValidator.predicate(
    "has pagination object",
    pendingReports.pagination !== undefined,
  );
  TestValidator.equals(
    "records count matches post reports",
    pendingReports.pagination.records,
    2,
  );
  TestValidator.predicate(
    "pages should be 1",
    pendingReports.pagination.pages >= 1,
  );
  // Validate data contains the reports
  TestValidator.equals("data has 2 reports", pendingReports.data.length, 2);
  // Validate all reports have pending status and correct structure
  for (const report of pendingReports.data) {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals(
      "report community matches",
      report.community.id,
      community.id,
    );
    // Verify reportedContent is a post by checking post_type property (specific to posts)
    TestValidator.predicate(
      "reportedContent is a post (has post_type)",
      "post_type" in report.reportedContent,
    );
  }
  // Verify both created reports are present
  const reportIds = pendingReports.data.map((r) => r.id);
  TestValidator.predicate(
    "report 1 exists in results",
    reportIds.includes(report1.id),
  );
  TestValidator.predicate(
    "report 2 exists in results",
    reportIds.includes(report2.id),
  );
}