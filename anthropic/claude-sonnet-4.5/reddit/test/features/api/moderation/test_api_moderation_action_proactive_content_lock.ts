import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderator proactively locking a post to prevent further comments without
 * responding to a specific report.
 *
 * This test validates that moderators can take preventive moderation actions on
 * content before violations occur. The workflow creates a member account,
 * establishes a community, creates a potentially controversial post, then
 * authenticates as a moderator and creates a proactive lock action without a
 * report_id.
 *
 * Steps:
 *
 * 1. Create member account for community and post creation
 * 2. Member creates a community
 * 3. Member creates a post that could become heated or controversial
 * 4. Register and authenticate as moderator
 * 5. Moderator creates proactive lock action without report_id
 * 6. Verify moderation action is created successfully
 * 7. Validate the action type and content type
 * 8. Confirm lock reasoning is recorded
 */
export async function test_api_moderation_action_proactive_content_lock(
  connection: api.IConnection,
) {
  // Step 1: Create member account
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

  // Step 2: Member creates a community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Member creates a potentially controversial post
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Register and authenticate as moderator
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

  // Step 5: Moderator creates proactive lock action (no report_id)
  const lockReasoning =
    "Locking this post proactively to prevent escalation of heated discussion and maintain community civility";
  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "lock",
        content_type: "post",
        reason_category: "preventive_measure",
        reason_text: lockReasoning,
        internal_notes:
          "Proactive lock due to potentially controversial content before reports emerge",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 6: Verify moderation action is created successfully
  TestValidator.equals(
    "action type should be lock",
    moderationAction.action_type,
    "lock",
  );
  TestValidator.equals(
    "content type should be post",
    moderationAction.content_type,
    "post",
  );

  // Step 7: Confirm lock reasoning is recorded
  TestValidator.equals(
    "lock reasoning recorded",
    moderationAction.reason_text,
    lockReasoning,
  );
  TestValidator.equals(
    "reason category is preventive",
    moderationAction.reason_category,
    "preventive_measure",
  );

  // Step 8: Verify action status is completed
  TestValidator.equals(
    "action status is completed",
    moderationAction.status,
    "completed",
  );
}
