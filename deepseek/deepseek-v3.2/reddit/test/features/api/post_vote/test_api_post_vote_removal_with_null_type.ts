import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test scenario where a member removes their vote entirely by setting vote type to null.
 * Validates: 1) Authenticated member can remove their own vote, 2) Setting vote type to null
 * effectively removes the vote (soft deletion), 3) Post author's karma is adjusted by
 * reversing the previous vote's effect (+1 for upvote removal, -1 for downvote removal),
 * 4) Post's vote score is adjusted accordingly, 5) Attempt to update non-existent vote
 * returns 404.
 */
export async function test_api_post_vote_removal_with_null_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup two member accounts: voter A and post author B
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create community owned by author B
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe both members to community
  const voterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(voterSubscription);
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(authorSubscription);
  // 4. Create text post by author B
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 5. Create initial upvote by voter A
  const initialVote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: { type: "up" },
      },
    );
  typia.assert(initialVote);
  // 6. Fetch author info to check initial karma
  const initialAuthor = await authorize_member_join(
    { host: connection.host },
    { body: { email: author.email, password: "same-password" } },
  );
  typia.assert(initialAuthor);
  // Validate initial state
  TestValidator.equals("post initial vote score", post.vote_score, 1);
  TestValidator.equals("author initial karma", initialAuthor.karma, 1);
  // 7. Remove vote by setting type to null
  const updatedVote =
    await api.functional.communityPlatform.member.posts.votes.putByPostidAndVoteid(
      voterConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: { type: null },
      },
    );
  typia.assert(updatedVote);
  // 8. Validate vote update
  TestValidator.equals(
    "vote type is null after removal",
    updatedVote.type,
    null,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at after removal",
    new Date(updatedVote.updated_at) > new Date(updatedVote.created_at),
  );
  // 9. Validate karma adjustment (should be 0 now: +1 -1 = 0)
  const updatedAuthor = await authorize_member_join(
    { host: connection.host },
    { body: { email: author.email, password: "same-password" } },
  );
  typia.assert(updatedAuthor);
  TestValidator.equals(
    "author karma after vote removal",
    updatedAuthor.karma,
    0,
  );
  // 10. Validate post vote score (should be 0 now)
  const updatedPost =
    await api.functional.communityPlatform.member.posts.create(
      authorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          community_name: community.name,
          content_type: "TEXT",
          content_text: {
            content: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 5,
              wordMax: 10,
            }),
            formatting: "plain",
          },
        },
      },
    );
  typia.assert(updatedPost);
  TestValidator.equals(
    "post vote score after removal",
    updatedPost.vote_score,
    0,
  );
  // 11. Additional test: downvote removal
  const post2 = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post2);
  const downvote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post2.id },
        body: { type: "down" },
      },
    );
  typia.assert(downvote);
  // Fetch author karma after downvote
  const authorAfterDownvote = await authorize_member_join(
    { host: connection.host },
    { body: { email: author.email, password: "same-password" } },
  );
  typia.assert(authorAfterDownvote);
  const karmaAfterDownvote = authorAfterDownvote.karma;
  // Remove downvote
  await api.functional.communityPlatform.member.posts.votes.putByPostidAndVoteid(
    voterConnection,
    {
      postId: post2.id,
      voteId: downvote.id,
      body: { type: null },
    },
  );
  // Validate karma increased by 1 (from -1 to 0)
  const authorAfterDownvoteRemoval = await authorize_member_join(
    { host: connection.host },
    { body: { email: author.email, password: "same-password" } },
  );
  typia.assert(authorAfterDownvoteRemoval);
  TestValidator.equals(
    "karma increases by 1 after downvote removal",
    authorAfterDownvoteRemoval.karma,
    karmaAfterDownvote + 1,
  );
  // 12. Error case: attempt to update non-existent vote
  await TestValidator.error(
    "updating non-existent vote returns error",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.putByPostidAndVoteid(
        voterConnection,
        {
          postId: post.id,
          voteId: typia.random<string & tags.Format<"uuid">>(),
          body: { type: null },
        },
      );
    },
  );
}
