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
 * Test that comment retrieval is publicly accessible without authentication.
 *
 * This test validates that the GET
 * /redditCommunity/posts/{postId}/comments/{commentId} endpoint is publicly
 * accessible and does not require authentication tokens.
 *
 * Workflow:
 *
 * 1. Create a member account to author the comment
 * 2. Create a moderator account to establish the community
 * 3. Moderator creates a community to host the content
 * 4. Member creates a post within the community
 * 5. Member creates a comment on the post
 * 6. Clear authentication to simulate guest/unauthenticated access
 * 7. Retrieve the comment without authentication
 * 8. Validate the retrieved comment data matches the created comment
 */
export async function test_api_comment_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create member account to author the comment
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphaNumeric(8);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates a community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch to member and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Member creates a comment on the post
  const commentBody = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: commentBody,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Clear authentication to simulate unauthenticated/guest access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 7: Retrieve the comment without authentication (public access)
  const retrievedComment =
    await api.functional.redditCommunity.posts.comments.at(
      unauthenticatedConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);

  // Step 8: Validate the retrieved comment matches the created comment
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment body matches",
    retrievedComment.body,
    commentBody,
  );
  TestValidator.equals(
    "comment post ID matches",
    retrievedComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment member ID matches",
    retrievedComment.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "comment depth is 0 for top-level",
    retrievedComment.depth,
    0,
  );
  TestValidator.equals(
    "parent comment is null for top-level",
    retrievedComment.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "comment is not edited initially",
    retrievedComment.edited,
    false,
  );
  TestValidator.equals(
    "comment is not deleted",
    retrievedComment.deleted_at,
    null,
  );
}
