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

export async function test_api_post_vote_create_upvote_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // Test creating an upvote on a post by an authenticated user.
  // Steps:
  // 1. Register a new user (POST /auth/user/join).
  // 2. Create a new post in a subscribed community (POST /communityPlatform/user/posts).
  // 3. Cast an upvote on the created post (POST /communityPlatform/user/post-votes) by submitting post_id and vote_type='upvote'.
  // Validate that the vote record is created with correct post_id and vote_type, timestamps are set, and the user's karma on the post author is incremented accordingly.
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new post in a subscribed community
  const createdPostRaw = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Assert the response includes the id property using type assertion
  type PostWithId = ICommunityPlatformPost & { id: string & tags.Format<"uuid"> };
  const newPost = typia.assert<PostWithId>(createdPostRaw);

  // 3. Cast an upvote on the created post
  const voteBody: ICommunityPlatformPostVote.ICreate = {
    post_id: newPost.id,
    vote_type: "upvote",
  };

  const voteRaw = await generate_random_community_platform_user_post_votes_create(
    userConnection,
    { body: voteBody },
  );
  // Assert vote includes required properties
  type VoteWithProps = ICommunityPlatformPostVote & {
    post_id: string & tags.Format<"uuid">;
    vote_type: "upvote" | "downvote";
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  };
  const vote = typia.assert<VoteWithProps>(voteRaw);

  // Validate vote
  TestValidator.equals("vote post_id matches", vote.post_id, newPost.id);
  TestValidator.equals("vote_type is upvote", vote.vote_type, "upvote");
  TestValidator.predicate(
    "vote created_at is present",
    vote.created_at !== null && vote.created_at !== undefined,
  );
  TestValidator.predicate(
    "vote updated_at is present",
    vote.updated_at !== null && vote.updated_at !== undefined,
  );
}
