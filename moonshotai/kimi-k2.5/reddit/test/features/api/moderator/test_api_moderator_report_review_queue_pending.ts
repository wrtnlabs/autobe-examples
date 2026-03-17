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
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_review_queue_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner setup - create and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // 2. Moderator setup - create member account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  // Get the moderator's member ID for assignment
  const moderatorMemberId = moderatorAuthorized.member.id;
  // 3. Reporting member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberUsername = RandomGenerator.name(1);
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 4. Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        iconAttachmentId: null,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 5. Owner assigns moderator to the community
  const moderatorRole =
    await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
      body: {
        communityId: community.id,
        memberId: moderatorMemberId,
        canAddModerators: false,
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderatorRole);
  // 6. Reporting member subscribes to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 7. Reporting member creates a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 8. Reporting member submits a report
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        reason: reportReason,
        postId: post.id,
        commentId: null,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 9. Moderator retrieves the reports queue
  const reportsQueue = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        communityId: community.id,
        status: "pending",
        createdAtFrom: null,
        createdAtTo: null,
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(reportsQueue);
  // Validate the response - pagination metadata
  TestValidator.equals(
    "pagination current page",
    reportsQueue.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", reportsQueue.pagination.limit, 10);
  TestValidator.predicate(
    "has at least one report",
    reportsQueue.data.length > 0,
  );
  // Find our created report in the queue
  const foundReport = reportsQueue.data.find((r) => r.id === report.id);
  TestValidator.predicate("found report in queue", foundReport !== undefined);
  if (foundReport) {
    // Validate report details
    TestValidator.equals(
      "report status is pending",
      foundReport.status,
      "pending",
    );
    TestValidator.equals(
      "report reason matches",
      foundReport.reason,
      reportReason,
    );
    TestValidator.equals(
      "reporter username matches",
      foundReport.reporter.username,
      memberUsername,
    );
    TestValidator.equals(
      "community ID matches",
      foundReport.community.id,
      community.id,
    );
    // Validate reported content is the post we created
    TestValidator.equals(
      "reported content ID matches",
      foundReport.reportedContent.id,
      post.id,
    );
    // Verify the reporter details
    TestValidator.equals(
      "reporter ID matches",
      foundReport.reporter.id,
      memberAuthorized.id,
    );
    TestValidator.equals(
      "reporter email matches",
      foundReport.reporter.email,
      memberEmail,
    );
  }
}
