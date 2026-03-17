import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_report_dismiss_post_pending_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // 2. Owner creates community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  // 3. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies Omit<IRedditLikeModerator.IJoin, "href" | "referrer" | "ip">,
  });
  // 4. Owner adds moderator to the community
  await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
    body: {
      communityId: community.id,
      memberId: moderator.member.id,
      canAddModerators: false,
    } satisfies IRedditLikeModerator.ICreate,
  });
  // 5. Authenticate as member (content creator and reporter)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 6. Member subscribes to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 7. Member creates a text post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  // 8. Member submits a report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
        commentId: null,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  // 9. Verify the report has 'pending' status
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  // 10. Moderator dismisses the report
  const dismissedReport =
    await api.functional.redditLike.moderator.reports.dismiss(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  // Validate dismissal response
  typia.assert(dismissedReport);
  // Report status should be 'dismissed'
  TestValidator.equals(
    "report status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );
  // The post content should remain visible and unchanged
  TestValidator.equals(
    "post should remain visible",
    dismissedReport.content.id,
    post.id,
  );
  // Narrow the union type to IRedditLikePost since we know this is a post report
  if ("title" in dismissedReport.content) {
    TestValidator.equals(
      "post title should be unchanged",
      dismissedReport.content.title,
      post.title,
    );
  }
  // A snapshot record should be created documenting the status change
  TestValidator.predicate(
    "snapshot record should exist",
    dismissedReport.snapshots.length > 0,
  );
  TestValidator.equals(
    "latest snapshot should show dismissed status",
    dismissedReport.snapshots[0].status,
    "dismissed",
  );
}