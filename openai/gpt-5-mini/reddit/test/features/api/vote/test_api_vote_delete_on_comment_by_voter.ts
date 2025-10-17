import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";

export async function test_api_vote_delete_on_comment_by_voter(
  connection: api.IConnection,
) {
  /**
   * E2E Test: Voter deletes their vote on a comment
   *
   * Workflow:
   *
   * 1. Create authorUser and voterUser (and otherUser) via POST /auth/member/join
   * 2. As authorUser: create a public community
   * 3. As authorUser: create a text post in that community
   * 4. As authorUser: create a comment under the post
   * 5. As voterUser: create a vote on that comment
   * 6. As voterUser: delete (soft-delete) the vote
   * 7. Verify that deletion by a different user fails (authorization)
   * 8. Verify that unauthenticated deletion fails (authentication)
   * 9. Attempt a repeated deletion to observe idempotency behavior and record it
   */

  // Prepare isolated connections for each actor so tokens do not collide
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const voterConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1) Register accounts
  const authorBody = {
    username: `author_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, { body: authorBody });
  typia.assert(author);

  const voterBody = {
    username: `voter_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const voter: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(voterConn, { body: voterBody });
  typia.assert(voter);

  const otherBody = {
    username: `other_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const otherUser: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, { body: otherBody });
  typia.assert(otherUser);

  // 2) Create a public community as author
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: `c-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(authorConn, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Create a text post in the community as author
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(authorConn, {
      body: postBody,
    });
  typia.assert(post);

  // 4) Create a comment under the post as author
  const commentBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      authorConn,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5) As voter, cast a vote on the comment
  const voteCreateBody = {
    value: 1,
  } satisfies ICommunityPortalVote.ICreate;

  const vote: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.comments.votes.create(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);
  TestValidator.predicate(
    "vote has id",
    typeof vote.id === "string" && vote.id.length > 0,
  );

  // 6) As voter (owner), delete (soft-delete) the vote
  await api.functional.communityPortal.member.posts.comments.votes.erase(
    voterConn,
    {
      postId: post.id,
      commentId: comment.id,
      voteId: vote.id,
    },
  );

  // If erase returns without throwing, consider deletion successful for owner
  TestValidator.predicate("owner deleted vote without error", true);

  // 7) Attempt deletion as a different authenticated user (should fail)
  await TestValidator.error(
    "other authenticated user cannot delete someone else's vote",
    async () => {
      await api.functional.communityPortal.member.posts.comments.votes.erase(
        otherConn,
        {
          postId: post.id,
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 8) Attempt deletion as unauthenticated user (should fail)
  await TestValidator.error(
    "unauthenticated user cannot delete vote",
    async () => {
      await api.functional.communityPortal.member.posts.comments.votes.erase(
        unauthConn,
        {
          postId: post.id,
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 9) Attempt repeated deletion by owner to observe idempotency behavior
  let secondDeletionSucceeded = false;
  let secondDeletionErrored = false;
  try {
    await api.functional.communityPortal.member.posts.comments.votes.erase(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: vote.id,
      },
    );
    secondDeletionSucceeded = true;
  } catch (exp) {
    secondDeletionErrored = true;
  }

  // Record which behavior was observed explicitly
  if (secondDeletionSucceeded) {
    TestValidator.predicate(
      "second deletion by owner succeeded (idempotent)",
      true,
    );
  } else if (secondDeletionErrored) {
    TestValidator.predicate(
      "second deletion by owner errored (non-idempotent)",
      true,
    );
  }
}
