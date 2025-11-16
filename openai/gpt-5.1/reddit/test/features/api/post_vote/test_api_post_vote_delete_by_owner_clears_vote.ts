import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate that a member user can delete their own post vote and then vote
 * again.
 *
 * Business context: A community platform member user casts a vote
 * (upvote/downvote) on a post. They should be able to clear that vote by
 * deleting the corresponding post-vote record, and after deletion, they should
 * be able to cast a fresh vote on the same post. Attempting to delete the same
 * vote twice should result in an error because the record no longer exists.
 *
 * High-level flow:
 *
 * 1. Register a new member user (join) and obtain an authenticated connection.
 * 2. Create a community as that member.
 * 3. Create a post in the community as that member.
 * 4. Cast a vote on the post and capture the vote id.
 * 5. Delete the vote via DELETE
 *    /communityPlatform/memberUser/postVotes/{postVoteId}.
 * 6. Attempt to delete the same vote again and expect an error.
 * 7. Cast a new vote on the same post, verifying that a fresh vote record is
 *    created.
 */
export async function test_api_post_vote_delete_by_owner_clears_vote(
  connection: api.IConnection,
) {
  // 1. Register a new member user and authenticate connection
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community
  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // Link creator to current authorized member
  TestValidator.equals(
    "community creator id matches authorized member id",
    community.creator.id,
    authorized.id,
  );

  // 3. Create a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: undefined,
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community id matches created community id",
    post.community.id,
    community.id,
  );

  // 4. Cast a vote on the post
  const voteValueOptions = [-1, 1] as const;
  const initialVoteValue = RandomGenerator.pick(voteValueOptions);

  const voteCreateBody = {
    community_platform_post_id: post.id,
    vote_value: initialVoteValue,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const initialVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: voteCreateBody },
    );
  typia.assert<ICommunityPlatformPostVote>(initialVote);

  TestValidator.equals(
    "initial vote post id matches created post id",
    initialVote.post.id,
    post.id,
  );

  // 5. Delete the vote (owner clears their vote)
  await api.functional.communityPlatform.memberUser.postVotes.erase(
    connection,
    { postVoteId: initialVote.id },
  );

  // 6. Second deletion attempt on same id should fail
  await TestValidator.error(
    "second delete on the same vote id should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.postVotes.erase(
        connection,
        { postVoteId: initialVote.id },
      );
    },
  );

  // 7. Cast a new vote again on the same post, verifying fresh record
  const newVoteValue = RandomGenerator.pick(voteValueOptions);

  const newVoteCreateBody = {
    community_platform_post_id: post.id,
    vote_value: newVoteValue,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const newVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: newVoteCreateBody },
    );
  typia.assert<ICommunityPlatformPostVote>(newVote);

  TestValidator.equals(
    "new vote post id still matches created post id",
    newVote.post.id,
    post.id,
  );

  TestValidator.notEquals(
    "new vote id must differ from initial vote id after deletion",
    newVote.id,
    initialVote.id,
  );
}
