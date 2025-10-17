import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";

/**
 * Validate soft-delete (erase) of a post vote and authorization controls.
 *
 * Workflow:
 *
 * 1. Register three members: author, voter, otherUser
 * 2. Author creates a community
 * 3. (Optional) Voter subscribes to the community
 * 4. Author creates a post in the community
 * 5. Voter casts a vote on the post
 * 6. Authorization checks:
 *
 *    - OtherUser cannot delete the vote (error)
 *    - Unauthenticated connection cannot delete the vote (error)
 *    - Voter (owner) can delete the vote successfully
 *    - Double-delete yields error (idempotency / not-found semantics)
 */
export async function test_api_post_vote_soft_delete_by_owner_and_authorization_checks(
  connection: api.IConnection,
) {
  // 1. Create three separate authenticated connections for three members
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const voterConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // Create account payloads
  const authorBody = {
    username: `author_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const voterBody = {
    username: `voter_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const otherBody = {
    username: `other_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  // 1a. Register users (join). Each join call will populate the respective connection's headers
  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, { body: authorBody });
  typia.assert(author);

  const voter: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(voterConn, { body: voterBody });
  typia.assert(voter);

  const otherUser: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, { body: otherBody });
  typia.assert(otherUser);

  // 2. Author creates a community
  const communityCreate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    slug: `c-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 6,
      wordMax: 12,
    }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(authorConn, {
      body: communityCreate,
    });
  typia.assert(community);
  TestValidator.predicate(
    "community created id present",
    typeof community.id === "string",
  );

  // 3. Subscribe voter to community (ensure membership when required)
  await api.functional.communityPortal.member.communities.subscriptions.create(
    voterConn,
    {
      communityId: community.id,
      body: {
        community_id: community.id,
      } satisfies ICommunityPortalSubscription.ICreate,
    },
  );

  // 4. Author creates a text post in the community
  const postCreate = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
    }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(authorConn, {
      body: postCreate,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community_id,
    community.id,
  );

  // 5. Voter casts a vote on the post
  const voteCreate = {
    value: 1,
  } satisfies ICommunityPortalVote.ICreate;

  const vote: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.votes.create(voterConn, {
      postId: post.id,
      body: voteCreate,
    });
  typia.assert(vote);
  TestValidator.equals("vote belongs to post", vote.post_id, post.id);

  // Prepare an unauthenticated connection (SDK-acceptable pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 6a. Attempt deletion as a different authenticated user (should fail)
  await TestValidator.error("non-owner cannot erase vote", async () => {
    await api.functional.communityPortal.member.posts.votes.erase(otherConn, {
      postId: post.id,
      voteId: vote.id,
    });
  });

  // 6b. Attempt deletion unauthenticated (should fail)
  await TestValidator.error(
    "unauthenticated user cannot erase vote",
    async () => {
      await api.functional.communityPortal.member.posts.votes.erase(
        unauthConn,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 6c. Owner deletes their own vote (should succeed)
  await api.functional.communityPortal.member.posts.votes.erase(voterConn, {
    postId: post.id,
    voteId: vote.id,
  });
  // If above does not throw, consider it success
  TestValidator.predicate("owner erased vote successfully", true);

  // 6d. Double-delete should now fail (idempotent/not-found behavior)
  await TestValidator.error(
    "erasing already-deleted vote should fail",
    async () => {
      await api.functional.communityPortal.member.posts.votes.erase(voterConn, {
        postId: post.id,
        voteId: vote.id,
      });
    },
  );
}
