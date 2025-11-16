import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test multiple sequential edits to the same comment to verify edit history
 * tracking.
 *
 * This test validates that the comment editing system properly tracks multiple
 * edits by updating the edited flag, changing timestamps, and creating
 * snapshots for each modification. The test ensures transparency and audit
 * trail functionality.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator and create community
 * 2. Authenticate as member
 * 3. Create post in the community
 * 4. Create initial comment on the post
 * 5. Perform first edit and validate edited flag is set and updated_at changes
 * 6. Perform second edit and validate updated_at changes again with edited flag
 *    still true
 * 7. Verify edit history tracking through response validation
 */
export async function test_api_comment_update_multiple_edits(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator and create community
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rules: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 3: Authenticate as member
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.name(3),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    { body: postData },
  );
  typia.assert(post);

  // Step 5: Create initial comment
  const initialCommentBody = RandomGenerator.paragraph({ sentences: 5 });
  const commentData = {
    body: initialCommentBody,
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Validate initial comment state
  TestValidator.equals("initial comment not edited", comment.edited, false);
  TestValidator.equals(
    "initial comment body matches",
    comment.body,
    initialCommentBody,
  );

  const initialCreatedAt = comment.created_at;
  const initialUpdatedAt = comment.updated_at;

  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Perform first edit
  const firstEditBody = RandomGenerator.paragraph({ sentences: 6 });
  const firstUpdate = {
    body: firstEditBody,
  } satisfies IRedditCommunityComment.IUpdate;

  const firstEditedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: firstUpdate,
      },
    );
  typia.assert(firstEditedComment);

  // Validate first edit
  TestValidator.equals(
    "first edit sets edited flag",
    firstEditedComment.edited,
    true,
  );
  TestValidator.equals(
    "first edit body updated",
    firstEditedComment.body,
    firstEditBody,
  );
  TestValidator.equals(
    "created_at unchanged after first edit",
    firstEditedComment.created_at,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed after first edit",
    firstEditedComment.updated_at !== initialUpdatedAt,
  );

  const firstEditUpdatedAt = firstEditedComment.updated_at;

  // Wait a moment to ensure timestamp difference for second edit
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 7: Perform second edit
  const secondEditBody = RandomGenerator.paragraph({ sentences: 7 });
  const secondUpdate = {
    body: secondEditBody,
  } satisfies IRedditCommunityComment.IUpdate;

  const secondEditedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: secondUpdate,
      },
    );
  typia.assert(secondEditedComment);

  // Validate second edit
  TestValidator.equals(
    "edited flag remains true after second edit",
    secondEditedComment.edited,
    true,
  );
  TestValidator.equals(
    "second edit body updated",
    secondEditedComment.body,
    secondEditBody,
  );
  TestValidator.equals(
    "created_at still unchanged after second edit",
    secondEditedComment.created_at,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed after second edit",
    secondEditedComment.updated_at !== firstEditUpdatedAt,
  );
  TestValidator.predicate(
    "second edit timestamp newer than first",
    secondEditedComment.updated_at > firstEditUpdatedAt,
  );

  // Final validation: ensure comment ID remains consistent
  TestValidator.equals(
    "comment ID unchanged through edits",
    secondEditedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "post reference unchanged",
    secondEditedComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "member reference unchanged",
    secondEditedComment.reddit_community_member_id,
    member.id,
  );
}
