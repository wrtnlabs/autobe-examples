import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";

export async function test_api_comment_vote_create_and_switch_by_member(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for multiple sessions
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const voterConn: api.IConnection = { ...connection, headers: {} };
  const anonConn: api.IConnection = { ...connection, headers: {} };

  // 2. Register author and voter members
  const authorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, { body: authorBody });
  typia.assert(author);

  const voterBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const voter: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(voterConn, { body: voterBody });
  typia.assert(voter);

  // 3. Author creates a community
  const communityBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(authorConn, {
      body: communityBody,
    });
  typia.assert(community);

  // 4. Ensure both users are subscribed (safe step in case membership is required)
  const subscriptionRequest = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;

  const authorSub: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      authorConn,
      {
        communityId: community.id,
        body: subscriptionRequest,
      },
    );
  typia.assert(authorSub);

  const voterSub: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      voterConn,
      {
        communityId: community.id,
        body: subscriptionRequest,
      },
    );
  typia.assert(voterSub);

  // 5. Author creates a text post in the community
  const postCreateBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(authorConn, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. Author creates a comment under the post
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

  // 7. Voter casts an upvote (+1)
  const voteUpBody = { value: 1 } satisfies ICommunityPortalVote.ICreate;
  const vote1: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.comments.votes.create(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteUpBody,
      },
    );
  typia.assert(vote1);

  TestValidator.equals(
    "vote created references comment",
    vote1.comment_id,
    comment.id,
  );
  TestValidator.equals("vote value is upvote", vote1.value, 1);
  TestValidator.equals(
    "vote returned voter id matches",
    vote1.user_id,
    voter.id,
  );

  // 8. Duplicate same +1 vote should be idempotent/upserted: result must still be +1
  const vote1Again: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.comments.votes.create(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteUpBody,
      },
    );
  typia.assert(vote1Again);
  TestValidator.equals("duplicate upvote remains +1", vote1Again.value, 1);
  TestValidator.equals(
    "duplicate upvote user preserved",
    vote1Again.user_id,
    voter.id,
  );

  // 9. Switch vote to -1 and assert authoritative returned vote value
  const voteDownBody = { value: -1 } satisfies ICommunityPortalVote.ICreate;
  const voteSwitched: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.comments.votes.create(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteDownBody,
      },
    );
  typia.assert(voteSwitched);
  TestValidator.equals("vote switched to downvote", voteSwitched.value, -1);
  TestValidator.equals(
    "switched vote user preserved",
    voteSwitched.user_id,
    voter.id,
  );

  // 10. Unauthenticated vote attempt should throw (error captured by TestValidator.error)
  await TestValidator.error("unauthenticated vote should fail", async () => {
    await api.functional.communityPortal.member.posts.comments.votes.create(
      anonConn,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteUpBody,
      },
    );
  });

  // 11. Invalid payload (value not +1/-1) should result in runtime validation error
  await TestValidator.error("invalid vote value should fail", async () => {
    await api.functional.communityPortal.member.posts.comments.votes.create(
      voterConn,
      {
        postId: post.id,
        commentId: comment.id,
        body: { value: 0 } satisfies ICommunityPortalVote.ICreate,
      },
    );
  });

  // 12. Concurrency: create N additional voters and vote concurrently
  const N = 3;
  const extraVoters = await ArrayUtil.asyncRepeat(N, async () => {
    const conn: api.IConnection = { ...connection, headers: {} };
    const body = {
      username: RandomGenerator.alphaNumeric(8),
      email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
      password: "P@ssw0rd!",
    } satisfies ICommunityPortalMember.ICreate;
    const u = await api.functional.auth.member.join(conn, { body });
    typia.assert(u);
    return { conn, member: u } as const;
  });

  const votePromises = extraVoters.map(({ conn }) =>
    api.functional.communityPortal.member.posts.comments.votes.create(conn, {
      postId: post.id,
      commentId: comment.id,
      body: voteUpBody,
    }),
  );

  const concurrentResults = await Promise.all(votePromises);
  concurrentResults.forEach((v) => typia.assert(v));

  // Validate we have N returned votes and sum of values equals N (all +1)
  TestValidator.equals("concurrent votes count", concurrentResults.length, N);
  const sum = concurrentResults.reduce((acc, cur) => acc + cur.value, 0);
  TestValidator.equals("concurrent votes sum equals N upvotes", sum, N);
}
