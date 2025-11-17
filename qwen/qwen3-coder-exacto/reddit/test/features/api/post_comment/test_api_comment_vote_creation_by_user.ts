import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { ICommunityForumPostCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostCommentVote";

/**
 * Test creating a new vote (upvote or downvote) on a comment.
 *
 * This test verifies that authenticated users can successfully vote on
 * comments, that the vote is properly recorded with the correct user and
 * comment associations, and that the voting preference (up or down) is
 * accurately stored. It also tests that users cannot vote on their own
 * comments, which is a business rule enforced by the system.
 *
 * The test follows these steps:
 *
 * 1. Create two users - one for posting content, another for voting
 * 2. Create a community
 * 3. Create a post in that community
 * 4. Create a comment on that post
 * 5. Vote on that comment as the second user
 * 6. Verify the vote was recorded correctly
 * 7. Attempt to vote on the same comment again (should fail)
 * 8. Attempt to vote on own comment (should fail)
 */
export async function test_api_comment_vote_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (comment author)
  const user1Email = `${RandomGenerator.alphabets(10)}@test.com`;
  const user1Join = {
    email: user1Email,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create second user (voter)
  const user2Email = `${RandomGenerator.alphabets(10)}@test.com`;
  const user2Join = {
    email: user2Email,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Set connection to use user2 for subsequent operations
  const user2Connection: IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${user2.token.access}`,
    },
  };

  // Step 3: Create a community as user1
  const communityCreate = {
    name:
      RandomGenerator.name(2).replace(/\s/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    slug:
      RandomGenerator.name(1).toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    rules: "Be respectful and follow community guidelines",
    privacy_level: "public" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityGroup.ICreate;

  // Switch back to user1
  const user1Connection: IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${user1.token.access}`,
    },
  };

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(
      user1Connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post as user1
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    type: "text" as const,
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(user1Connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 5: Create a comment as user1
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
    ip: "127.0.0.1",
    href: "http://localhost:3000/post/" + post.id,
    referrer: "http://localhost:3000/community/" + community.id,
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(
      user1Connection,
      {
        postId: post.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  // Step 6: Vote on the comment as user2 (upvote)
  const voteCreate = {
    is_upvote: true,
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const vote: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(
      user2Connection,
      {
        commentId: comment.id,
        body: voteCreate,
      },
    );
  typia.assert(vote);

  // Step 7: Verify the vote was recorded correctly
  TestValidator.equals(
    "vote id should be valid UUID",
    typeof vote.id,
    "string",
  );
  TestValidator.predicate("vote should be an upvote", vote.is_upvote === true);
  TestValidator.equals(
    "vote should reference correct user",
    vote.user.id,
    user2.id,
  );
  TestValidator.equals(
    "vote should reference correct comment",
    vote.comment.id,
    comment.id,
  );
  TestValidator.predicate(
    "vote created_at should be valid date",
    (): boolean => {
      const date = new Date(vote.created_at);
      return date instanceof Date && !isNaN(date.getTime());
    },
  );

  // Step 8: Try to vote again on the same comment (should fail)
  await TestValidator.error("cannot vote on same comment twice", async () => {
    await api.functional.communityForum.user.comments.votes.create(
      user2Connection,
      {
        commentId: comment.id,
        body: {
          is_upvote: false,
        } satisfies ICommunityForumPostCommentVote.ICreate,
      },
    );
  });

  // Step 9: Try to vote on own comment as user1 (should fail)
  await TestValidator.error("cannot vote on own comment", async () => {
    await api.functional.communityForum.user.comments.votes.create(
      user1Connection,
      {
        commentId: comment.id,
        body: {
          is_upvote: true,
        } satisfies ICommunityForumPostCommentVote.ICreate,
      },
    );
  });

  // Step 10: Create another comment and downvote it as user2
  const comment2Create = {
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 10 }),
    ip: "127.0.0.1",
    href: "http://localhost:3000/post/" + post.id,
    referrer: "http://localhost:3000/community/" + community.id,
  } satisfies ICommunityForumPostComment.ICreate;

  const comment2: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(
      user1Connection,
      {
        postId: post.id,
        body: comment2Create,
      },
    );
  typia.assert(comment2);

  // Downvote this comment
  const downvoteCreate = {
    is_upvote: false,
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const downvote: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(
      user2Connection,
      {
        commentId: comment2.id,
        body: downvoteCreate,
      },
    );
  typia.assert(downvote);

  // Verify it's a downvote
  TestValidator.predicate(
    "vote should be a downvote",
    downvote.is_upvote === false,
  );
  TestValidator.equals(
    "downvote should reference correct user",
    downvote.user.id,
    user2.id,
  );
  TestValidator.equals(
    "downvote should reference correct comment",
    downvote.comment.id,
    comment2.id,
  );
}
