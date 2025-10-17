import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test proactive moderation action creation where a moderator removes content
 * without an associated report.
 *
 * This test validates that moderators can take proactive enforcement actions on
 * content that violates community rules, even when no user has reported it. The
 * workflow creates a member account, establishes a community, creates a post,
 * creates a moderator account, assigns moderation permissions, and then creates
 * a proactive moderation action without a triggering report_id.
 *
 * Steps:
 *
 * 1. Create member account and community
 * 2. Member creates a post in the community
 * 3. Create moderator account
 * 4. Assign moderator to the community
 * 5. Moderator creates proactive removal action
 * 6. Validate action properties and reasoning
 */
export async function test_api_moderation_action_proactive_content_removal(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community and post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Member creates a community (becomes primary moderator automatically)
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Member creates a post in the community
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 5: Assign moderator to the community with moderation permissions
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 6: Moderator creates proactive moderation action to remove the post
  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          community_id: community.id,
          affected_post_id: post.id,
          action_type: "remove",
          content_type: "post",
          removal_type: "community",
          reason_category: "spam",
          reason_text:
            "Proactive removal of spam content violating community guidelines",
          internal_notes:
            "Detected through automated monitoring - no user report",
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 7: Validate moderation action properties
  TestValidator.equals(
    "moderation action type should be remove",
    moderationAction.action_type,
    "remove",
  );

  TestValidator.equals(
    "content type should be post",
    moderationAction.content_type,
    "post",
  );

  TestValidator.equals(
    "reason category should be spam",
    moderationAction.reason_category,
    "spam",
  );

  TestValidator.equals(
    "reason text should be documented",
    moderationAction.reason_text,
    "Proactive removal of spam content violating community guidelines",
  );

  TestValidator.equals(
    "removal type should be community-level",
    moderationAction.removal_type,
    "community",
  );

  TestValidator.equals(
    "status should be completed",
    moderationAction.status,
    "completed",
  );
}
