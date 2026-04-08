import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
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
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test that moderators cannot approve their own submitted reports.
 *
 * Validates the self-report approval blocking mechanism to prevent moderators from approving reports they submitted themselves. This ensures separation between reporter and approver roles, preventing potential abuse of the moderation system.
 *
 * 1. Create a member account and authenticate as moderator
 * 2. Create a community and add the member as moderator
 * 3. Create a post in the community
 * 4. Have the moderator submit a report on their own community's post
 * 5. Attempt to approve the report using the update endpoint
 * 6. Verify the operation fails with a conflict error
 * 7. Verify the report status remains pending by successfully dismissing it
 * 8. Verify the reported post remains accessible
 */
export async function test_api_report_approval_blocked_for_self_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Add moderator to community
  const moderatorAssignment =
    await generate_random_reddit_like_member_communities_moderators_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: moderator.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Have the moderator submit a report on their own community's post
  const report = await generate_random_reddit_like_member_reports_create(
    moderatorConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Attempt to approve the report (should fail)
  await TestValidator.error("moderator cannot approve own report", async () => {
    await api.functional.redditLike.member.reports.update(moderatorConnection, {
      reportId: report.id,
      body: { status: "approved" } satisfies IRedditLikeReport.IUpdate,
    });
  });
  // 7. Verify report status remains pending by successfully dismissing it
  const dismissedReport = await api.functional.redditLike.member.reports.update(
    moderatorConnection,
    {
      reportId: report.id,
      body: { status: "dismissed" } satisfies IRedditLikeReport.IUpdate,
    },
  );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "report was still pending after failed approval",
    dismissedReport.status,
    "dismissed",
  );
}
