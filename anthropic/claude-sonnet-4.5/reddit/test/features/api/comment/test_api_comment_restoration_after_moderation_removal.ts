import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test administrator restoration of moderator-removed comments.
 *
 * Validates the complete moderation appeal workflow where an administrator
 * exercises platform-wide authority to restore a comment that was previously
 * removed by a community moderator. This test ensures that admin restoration
 * properly overrides moderator removal decisions, preserves all original
 * comment data, and reintegrates the comment into the discussion thread.
 *
 * Test workflow:
 *
 * 1. Create moderator account with community moderation permissions
 * 2. Create member account for comment authoring
 * 3. Create administrator account with platform-wide override authority
 * 4. Moderator creates a community to establish moderation context
 * 5. Moderator creates a post within the community
 * 6. Member creates a comment on the post
 * 7. Moderator removes the comment (soft-deletion with deleted_at set)
 * 8. Administrator restores the removed comment (clears deleted_at)
 * 9. Validate restoration preserves content, votes, and thread position
 */
export async function test_api_comment_restoration_after_moderation_removal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create administrator account
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 4: Switch to moderator context and create community
  connection.headers = { Authorization: moderator.token.access };

  const communityData = {
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
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 5: Moderator creates a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body: typia.random<string & tags.MaxLength<40000>>(),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 6: Switch to member context and create a comment
  connection.headers = { Authorization: member.token.access };

  const commentData = {
    reddit_like_post_id: post.id,
    content_text: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<10000>
    >(),
  } satisfies IRedditLikeComment.ICreate;

  const originalComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(originalComment);

  // Step 7: Switch to moderator context and remove the comment
  connection.headers = { Authorization: moderator.token.access };

  const removalData = {
    removal_type: "community",
    reason_category: "spam",
    reason_text: "Test removal for restoration validation",
    internal_notes: "Testing admin restoration workflow",
  } satisfies IRedditLikeComment.IRemove;

  await api.functional.redditLike.moderator.comments.remove(connection, {
    commentId: originalComment.id,
    body: removalData,
  });

  // Step 8: Switch to admin context and restore the comment
  connection.headers = { Authorization: admin.token.access };

  const restoredComment: IRedditLikeComment =
    await api.functional.redditLike.admin.comments.restore(connection, {
      commentId: originalComment.id,
    });
  typia.assert(restoredComment);

  // Step 9: Validate restoration results
  TestValidator.equals(
    "restored comment ID matches original",
    restoredComment.id,
    originalComment.id,
  );
  TestValidator.equals(
    "restored comment post ID matches",
    restoredComment.reddit_like_post_id,
    originalComment.reddit_like_post_id,
  );
  TestValidator.equals(
    "restored comment content preserved",
    restoredComment.content_text,
    originalComment.content_text,
  );
  TestValidator.equals(
    "restored comment depth preserved",
    restoredComment.depth,
    originalComment.depth,
  );
  TestValidator.equals(
    "restored comment vote score preserved",
    restoredComment.vote_score,
    originalComment.vote_score,
  );
  TestValidator.equals(
    "restored comment edited flag preserved",
    restoredComment.edited,
    originalComment.edited,
  );
  TestValidator.equals(
    "restored comment creation timestamp preserved",
    restoredComment.created_at,
    originalComment.created_at,
  );
}
