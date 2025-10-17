import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_appeal_retrieval_escalated_to_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for content context
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
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
    },
  );
  typia.assert(community);

  // Step 3: Create post that will be moderated
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Assign moderator to community with moderation permissions
  const communityModerator =
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
  typia.assert(communityModerator);

  // Step 6: Moderator removes the post for rule violations
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 7: Switch back to member context by re-authenticating
  const memberReauth = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(memberReauth);

  // Step 8: Member appeals the moderation action
  const appealText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 8,
  });
  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: moderationAction.id,
          appeal_type: "content_removal",
          appeal_text: appealText,
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 9: Escalate the appeal to administrator review
  const escalatedAppeal =
    await api.functional.redditLike.member.moderation.appeals.escalate.postByAppealid(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(escalatedAppeal);
  TestValidator.equals(
    "appeal is escalated",
    escalatedAppeal.is_escalated,
    true,
  );

  // Step 10: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 11: Administrator retrieves the escalated appeal
  const retrievedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.at(
      connection,
      {
        appealId: escalatedAppeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 12: Validate the retrieved appeal contains correct escalation information
  TestValidator.equals(
    "retrieved appeal ID matches",
    retrievedAppeal.id,
    escalatedAppeal.id,
  );
  TestValidator.equals(
    "appeal is marked as escalated",
    retrievedAppeal.is_escalated,
    true,
  );
  TestValidator.equals(
    "appeal type is content removal",
    retrievedAppeal.appeal_type,
    "content_removal",
  );
}
