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

/**
 * Validate updating a comment vote by its owner and enforce authorization.
 *
 * Scenario (adapted to available SDK functions):
 *
 * 1. Create two members: authorUser and voterUser via POST /auth/member/join
 * 2. As authorUser: create a public community
 * 3. As authorUser: create a text post in that community
 * 4. As authorUser: create a top-level comment under the post
 * 5. As voterUser: create an initial upvote (+1) on the comment
 * 6. As voterUser: update the vote to -1 via PUT endpoint and assert updated value
 *    and timestamps
 * 7. Verify that a different authenticated user (authorUser) cannot update the
 *    vote (expect error)
 * 8. Verify that unauthenticated update attempt fails (expect error)
 * 9. Verify updating a non-existent voteId fails (expect error)
 *
 * Notes:
 *
 * - Because GET endpoints for post/comment aggregates and user profile are not
 *   provided in the SDK materials, this test focuses on validating the vote
 *   resource returned by create/update calls and authorization behavior.
 */
export async function test_api_vote_update_on_comment_by_voter(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for each actor
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const voterConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create authorUser
  const authorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, { body: authorBody });
  typia.assert(author);

  // 3) Create voterUser
  const voterBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const voter: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(voterConn, { body: voterBody });
  typia.assert(voter);

  // 4) Create community as author
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(authorConn, {
      body: communityBody,
    });
  typia.assert(community);

  // 5) Create a text post in the community as author
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(authorConn, {
      body: postBody,
    });
  typia.assert(post);

  // 6) Create a top-level comment under the post as author
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

  // 7) Voter casts an initial upvote (+1) on the comment
  const voteCreateBody = {
    value: 1,
  } satisfies ICommunityPortalVote.ICreate;

  const createdVote: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.comments.votes.create(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(createdVote);
  TestValidator.equals("created vote value is +1", createdVote.value, 1);
  TestValidator.predicate(
    "created vote has created_at",
    typeof createdVote.created_at === "string" &&
      createdVote.created_at.length > 0,
  );

  // 8) Voter updates the vote to -1
  const updateBody = {
    value: -1,
  } satisfies ICommunityPortalVote.IUpdate;

  const updatedVote: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.comments.votes.update(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: createdVote.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVote);

  TestValidator.equals("updated vote value is -1", updatedVote.value, -1);
  TestValidator.predicate(
    "updated_at is present",
    typeof updatedVote.updated_at === "string" &&
      updatedVote.updated_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is later than or equal created_at",
    new Date(updatedVote.updated_at).getTime() >=
      new Date(createdVote.created_at).getTime(),
  );

  // 9) Attempt update by a non-owner (authorConn) -> expect error
  await TestValidator.error("non-owner cannot update vote", async () => {
    await api.functional.communityPortal.member.posts.comments.votes.update(
      authorConn,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: createdVote.id,
        body: updateBody,
      },
    );
  });

  // 10) Attempt update unauthenticated -> expect error
  await TestValidator.error("unauthenticated cannot update vote", async () => {
    await api.functional.communityPortal.member.posts.comments.votes.update(
      unauthConn,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: createdVote.id,
        body: updateBody,
      },
    );
  });

  // 11) Attempt update non-existent voteId -> expect error
  await TestValidator.error("updating non-existent vote fails", async () => {
    await api.functional.communityPortal.member.posts.comments.votes.update(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  });
}
