import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { generate_random_reddit_clone_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a banned member cannot report content within the community where they are banned.
 *
 * Validates the restriction that prevents banned users from participating in community moderation activities, specifically the ability to report posts or comments. The test creates a member, has them subscribe to a community and create a post, then bans them via a moderator, and finally attempts to report the post as the banned user.
 *
 * The test verifies that the report creation endpoint returns a 403 Forbidden error when the reporter is banned from the community where the reported content exists. This enforces the business rule that banned users cannot engage in moderation-related actions.
 *
 * Special attention is given to:
 * - Ensuring the member is properly subscribed before creating posts
 * - Validating that the ban is successfully created by the moderator
 * - Confirming the 403 Forbidden error is returned when a banned user attempts to report
 *
 * 1. Register a new member account and authenticate.
 * 2. Subscribe the member to a community.
 * 3. Create a post in the community as the member.
 * 4. Register a moderator account and authenticate.
 * 5. Ban the member from the community as the moderator.
 * 6. Attempt to report the post as the banned member.
 * 7. Verify the report creation fails with a 403 Forbidden error.
 */
export async function test_api_report_banned_user_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Subscribe to a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: { community_id: communityId },
    },
  );
  // 3. Create a post in the community as the member
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Register and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // 5. Ban the member from the community as the moderator
  await generate_random_reddit_clone_moderator_communities_bans_create(
    moderatorConnection,
    {
      params: { communityId },
      body: {
        ban_reason: "Violation of community guidelines",
        reddit_clone_member_id: memberAuth.id,
      },
    },
  );
  // 6. Attempt to report the post as the banned member
  await TestValidator.httpError(
    "banned member cannot report post",
    403,
    async () => {
      await generate_random_reddit_clone_member_reports_create(
        memberConnection,
        {
          body: {
            report_type: "post",
            post_id: post.id,
            reason: "This content violates community rules",
          },
        },
      );
    },
  );
}
