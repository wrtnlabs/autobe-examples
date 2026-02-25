import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_score_vote_change_updates_stats_for_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Regular user creates community and post
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_user_posts_create(
    authorConnection,
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
  // 3. Create additional users to vote
  const voterConnections: api.IConnection[] = ArrayUtil.repeat(4, () => ({
    host: connection.host,
  }));
  const votes: ICommunityPlatformPostVote[] = [];
  // Create initial votes (2 upvotes, 2 downvotes)
  for (let i = 0; i < 4; i++) {
    await authorize_user_join(voterConnections[i], {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    const voteType: "upvote" | "downvote" = i < 2 ? "upvote" : "downvote";
    const vote =
      await generate_random_community_platform_user_posts_votes_create(
        voterConnections[i],
        {
          body: {
            vote_type: voteType,
          } satisfies ICommunityPlatformPostVote.ICreate,
          params: {
            postId: post.id,
          },
        },
      );
    typia.assert(vote);
    votes.push(vote);
  }
  // 4. Admin retrieves initial vote score
  const initialScore =
    await api.functional.communityPlatform.admin.posts.vote_score.at(
      adminConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(initialScore);
  TestValidator.equals("initial upvote count", initialScore.upvote_count, 2);
  TestValidator.equals(
    "initial downvote count",
    initialScore.downvote_count,
    2,
  );
  TestValidator.equals("initial total score", initialScore.total_score, 0);
  // 5. Users change their votes
  // First user changes from upvote to downvote (should decrease total_score by 2)
  const updatedVote1 =
    await api.functional.communityPlatform.user.posts.votes.update(
      voterConnections[0],
      {
        postId: post.id,
        voteId: votes[0].id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote1);
  // Second user removes their vote (should decrease total_score by 1 if upvote)
  await api.functional.communityPlatform.user.posts.votes.erase(
    voterConnections[1],
    {
      postId: post.id,
      voteId: votes[1].id,
    },
  );
  // Third user changes from downvote to upvote (should increase total_score by 2)
  const updatedVote3 =
    await api.functional.communityPlatform.user.posts.votes.update(
      voterConnections[2],
      {
        postId: post.id,
        voteId: votes[2].id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote3);
  // 6. Admin retrieves updated vote score
  const updatedScore =
    await api.functional.communityPlatform.admin.posts.vote_score.at(
      adminConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(updatedScore);
  // Validate changes
  TestValidator.equals("updated upvote count", updatedScore.upvote_count, 2);
  TestValidator.equals(
    "updated downvote count",
    updatedScore.downvote_count,
    1,
  );
  TestValidator.equals("updated total score", updatedScore.total_score, 1);
  // Verify timestamp updated
  TestValidator.predicate(
    "last_updated_at should be updated",
    updatedScore.last_updated_at !== null &&
      updatedScore.last_updated_at > initialScore.last_updated_at!,
  );
}
