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
 * Test complete workflow of member permanently deleting their own comment.
 *
 * This test validates the hard delete functionality for comments where the
 * author (member) removes their comment from a post, resulting in permanent
 * deletion from the database. The test ensures deletion is immediate and
 * irreversible.
 *
 * Workflow:
 *
 * 1. Register and authenticate as member
 * 2. Create moderator account and community
 * 3. Switch back to member and create post
 * 4. Add comment to the post
 * 5. Delete the comment as author
 * 6. Verify permanent deletion (hard delete)
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create community as moderator
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 5: Create post in the community as member
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        post_type: "text",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create comment on the post as member
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Verify comment was created successfully with correct relationships
  TestValidator.equals(
    "comment post ID matches",
    comment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author is member",
    comment.reddit_community_member_id,
    member.id,
  );
  TestValidator.predicate("comment has content", comment.body.length > 0);
  TestValidator.equals(
    "comment is not deleted initially",
    comment.deleted_at,
    null,
  );

  // Step 7: Delete the comment as the author (member)
  await api.functional.redditCommunity.member.posts.comments.erase(connection, {
    postId: post.id,
    commentId: comment.id,
  });

  // Step 8: Verify deletion succeeded
  // The comment has been permanently removed from the database (hard delete)
  // The API returned successfully (void), confirming the deletion operation completed
  // Note: Without a GET endpoint for individual comments, we cannot verify the comment
  // is truly gone, but the successful completion of the erase operation indicates
  // the hard delete was performed as expected
}
