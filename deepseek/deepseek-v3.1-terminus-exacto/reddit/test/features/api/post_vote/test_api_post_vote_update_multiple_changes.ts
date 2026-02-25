import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_update_multiple_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(user);
  // 2. Create community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create initial upvote
  const initialVote =
    await api.functional.communityPlatform.user.posts.votes.create(
      userConnection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // 5. Change vote to downvote
  const downvote =
    await api.functional.communityPlatform.user.posts.votes.update(
      userConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(downvote);
  // 6. Change vote back to upvote
  const finalVote =
    await api.functional.communityPlatform.user.posts.votes.update(
      userConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(finalVote);
  // 7. Validate vote type changes
  TestValidator.equals("initial vote type", initialVote.vote_type, "upvote");
  TestValidator.equals("downvote type", downvote.vote_type, "downvote");
  TestValidator.equals("final vote type", finalVote.vote_type, "upvote");
  // 8. Validate vote ID consistency
  TestValidator.equals("vote ID consistency", initialVote.id, downvote.id);
  TestValidator.equals("vote ID consistency", downvote.id, finalVote.id);
  // 9. Validate user relationship consistency
  TestValidator.equals("user ID consistency", initialVote.user.id, user.id);
  TestValidator.equals("user ID consistency", downvote.user.id, user.id);
  TestValidator.equals("user ID consistency", finalVote.user.id, user.id);
  // 10. Validate post relationship consistency
  TestValidator.equals("post ID consistency", initialVote.post.id, post.id);
  TestValidator.equals("post ID consistency", downvote.post.id, post.id);
  TestValidator.equals("post ID consistency", finalVote.post.id, post.id);
  // 11. Validate timestamp updates
  TestValidator.predicate(
    "created_at consistent",
    initialVote.created_at === downvote.created_at &&
      downvote.created_at === finalVote.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialVote.updated_at,
    downvote.updated_at,
  );
  TestValidator.notEquals(
    "updated_at changed again",
    downvote.updated_at,
    finalVote.updated_at,
  );
}
