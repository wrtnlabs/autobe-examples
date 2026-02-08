import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_post_votes_create } from "../../../generate/generate_random_community_platform_user_post_votes_create";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_update_user_owned_vote(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: User successfully updates an existing vote on their own post.
  // 1. User joins
  const userConnection1: api.IConnection = { host: connection.host };
  const auth1 = await authorize_user_join(userConnection1, { body: {} });
  typia.assert(auth1);
  userConnection1.headers = { Authorization: auth1.token.access };
  // 2. User creates a post
  const postRaw = await api.functional.communityPlatform.user.posts.create(
    userConnection1,
    {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    },
  );
  typia.assert(postRaw);
  const post = postRaw as unknown as (ICommunityPlatformPost & { id: string });
  // 3. User casts an initial vote (randomly upvote or downvote)
  const initialVoteType = RandomGenerator.pick(["upvote", "downvote"] as const);
  const initialVoteRaw =
    await generate_random_community_platform_user_post_votes_create(
      userConnection1,
      {
        body: {
          post_id: post.id,
          vote_type: initialVoteType,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(initialVoteRaw);
  const initialVote = initialVoteRaw as unknown as (ICommunityPlatformPostVote & { id: string; vote_type:"upvote"|"downvote"; updated_at:string; created_at:string });
  // 4. Update the vote to the opposite vote_type
  const updatedVoteType = initialVoteType === "upvote" ? "downvote" : "upvote";
  const updatedVoteRaw =
    await api.functional.communityPlatform.user.post_votes.update(
      userConnection1,
      {
        postVoteId: initialVote.id,
        body: {
          vote_type: updatedVoteType,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVoteRaw);
  const updatedVote = updatedVoteRaw as unknown as (ICommunityPlatformPostVote & { vote_type: "upvote" | "downvote"; updated_at:string; created_at:string });
  // 5. Validate that updated vote_type is opposite
  TestValidator.equals(
    "updated vote type",
    updatedVote.vote_type,
    updatedVoteType,
  );
  // 6. Validate that the updated_at timestamp is newer than created_at
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedVote.updated_at) > new Date(updatedVote.created_at),
  );
  // Scenario 2: User attempts to update a vote that does not exist.
  // 1. Another user joins
  const userConnection2: api.IConnection = { host: connection.host };
  const auth2 = await authorize_user_join(userConnection2, { body: {} });
  typia.assert(auth2);
  userConnection2.headers = { Authorization: auth2.token.access };
  // 2. Attempt to update a non-existent vote (random UUID)
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("update non-existent vote", 404, async () => {
    await api.functional.communityPlatform.user.post_votes.update(
      userConnection2,
      {
        postVoteId: nonExistentVoteId,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  });
  // Scenario 3: User attempts to update a vote owned by another user.
  // 1. User A joins
  const userConnection3: api.IConnection = { host: connection.host };
  const auth3 = await authorize_user_join(userConnection3, { body: {} });
  typia.assert(auth3);
  userConnection3.headers = { Authorization: auth3.token.access };
  // 2. User A creates a post
  const postARaw = await api.functional.communityPlatform.user.posts.create(
    userConnection3,
    {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    },
  );
  typia.assert(postARaw);
  const postA = postARaw as unknown as (ICommunityPlatformPost & { id: string });
  // 3. User A votes on the post
  const voteARaw = await generate_random_community_platform_user_post_votes_create(
    userConnection3,
    {
      body: {
        post_id: postA.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(voteARaw);
  const voteA = voteARaw as unknown as (ICommunityPlatformPostVote & { id: string });
  // 4. User B joins
  const userConnection4: api.IConnection = { host: connection.host };
  const auth4 = await authorize_user_join(userConnection4, { body: {} });
  typia.assert(auth4);
  userConnection4.headers = { Authorization: auth4.token.access };
  // 5. User B tries to update User A's vote - should be forbidden
  await TestValidator.httpError(
    "update vote owned by another user",
    403,
    async () => {
      await api.functional.communityPlatform.user.post_votes.update(
        userConnection4,
        {
          postVoteId: voteA.id,
          body: {
            vote_type: "downvote",
          } satisfies ICommunityPlatformPostVote.IUpdate,
        },
      );
    },
  );
}
