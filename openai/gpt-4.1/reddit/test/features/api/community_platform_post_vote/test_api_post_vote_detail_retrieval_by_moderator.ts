import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate that a moderator can retrieve full detail of a specific post vote,
 * with proper permission restrictions and accurate business context.
 *
 * End-to-end steps:
 *
 * 1. Register a member.
 * 2. Member creates a community.
 * 3. Member creates a post in that community.
 * 4. Member casts a vote (upvote or downvote) on that post.
 * 5. Use the same member to register as a moderator for the community.
 * 6. After moderator login, retrieve the vote detail using moderator API, validate
 *    all vote properties.
 * 7. As negative test, attempt to access with an invalid (random) voteId, assert
 *    error occurs.
 * 8. As negative test, try fetching the vote without moderator login (e.g. with
 *    member connection), assert forbidden.
 */
export async function test_api_post_vote_detail_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Member creates a community
  const communityRequest = {
    name: RandomGenerator.name(2),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityRequest },
    );
  typia.assert(community);

  // 3. Member creates a post
  const postRequest = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    content_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 6,
    }),
    content_type: RandomGenerator.pick(["text", "link", "image"] as const),
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: postRequest },
  );
  typia.assert(post);

  // 4. Member votes on the post
  const voteRequest = {
    vote_value: RandomGenerator.pick([
      -1, 1,
    ] as const) satisfies number as number,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote = await api.functional.communityPlatform.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: voteRequest,
    },
  );
  typia.assert(vote);

  // 5. Register same member as moderator for the community
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // Switch connection to moderator (token automatically updated after join)
  // 6. Retrieve vote detail as moderator
  const fetchedVote =
    await api.functional.communityPlatform.moderator.posts.votes.at(
      connection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(fetchedVote);
  TestValidator.equals("retrieved vote id matches", fetchedVote.id, vote.id);
  TestValidator.equals(
    "retrieved post id matches",
    fetchedVote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "retrieved member id matches",
    fetchedVote.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "retrieved vote value matches",
    fetchedVote.vote_value,
    vote.vote_value,
  );
  TestValidator.equals(
    "retrieved vote created_at matches",
    fetchedVote.created_at,
    vote.created_at,
  );
  TestValidator.equals(
    "retrieved vote updated_at matches",
    fetchedVote.updated_at,
    vote.updated_at,
  );
  TestValidator.equals(
    "retrieved vote deleted_at matches",
    fetchedVote.deleted_at ?? null,
    vote.deleted_at ?? null,
  );

  // 7. Negative: try retrieving with random vote id (should error)
  const randomVoteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("fetching with invalid vote id fails", async () => {
    await api.functional.communityPlatform.moderator.posts.votes.at(
      connection,
      {
        postId: post.id,
        voteId: randomVoteId,
      },
    );
  });

  // 8. Negative: try fetching as member (should be forbidden)
  // Switch connection to member (refresh token)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "member cannot fetch vote detail as moderator",
    async () => {
      await api.functional.communityPlatform.moderator.posts.votes.at(
        connection,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );
}
