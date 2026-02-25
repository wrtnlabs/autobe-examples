import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_vote_change_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and create an authenticated user connection
  const userJoinResponse: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          username: RandomGenerator.name(1),
          displayName: RandomGenerator.name(1),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: null,
        },
      },
    );
  typia.assert(userJoinResponse);
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: userJoinResponse.token.access },
  };
  // 2. Create a new community as the user
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconUrl: `https://example.com/icons/${RandomGenerator.alphabets(10)}.png`,
        },
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const postCreateBody = {
    title: RandomGenerator.name(3),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 4. Cast the initial upvote
  const upvoteBody: ICommunityPlatformPostVote.IUpdate = {
    voteType: "upvote",
  };
  const upvoteResponse: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.posts.votes.updateVote(
      userConnection,
      {
        postId: post.id,
        body: upvoteBody,
      },
    );
  typia.assert(upvoteResponse);
  TestValidator.equals("initial upvote upvotes", upvoteResponse.upvotes, 1);
  TestValidator.equals("initial upvote downvotes", upvoteResponse.downvotes, 0);
  // 5. Change vote from upvote to downvote
  const downvoteBody: ICommunityPlatformPostVote.IUpdate = {
    voteType: "downvote",
  };
  const downvoteResponse: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.posts.votes.updateVote(
      userConnection,
      {
        postId: post.id,
        body: downvoteBody,
      },
    );
  typia.assert(downvoteResponse);
  // 6. Validate that the vote counts reflect one downvote, zero upvotes
  TestValidator.equals(
    "post votes upvotes after change",
    downvoteResponse.upvotes,
    0,
  );
  TestValidator.equals(
    "post votes downvotes after change",
    downvoteResponse.downvotes,
    1,
  );
  // 7. Ensure no duplicate vote record by casting the downvote again
  const downvoteAgainResponse: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.posts.votes.updateVote(
      userConnection,
      {
        postId: post.id,
        body: downvoteBody,
      },
    );
  typia.assert(downvoteAgainResponse);
  // Validate vote count remains the same
  TestValidator.equals(
    "post votes downvotes after repeated downvote",
    downvoteAgainResponse.downvotes,
    1,
  );
  TestValidator.equals(
    "post votes upvotes after repeated downvote",
    downvoteAgainResponse.upvotes,
    0,
  );
}
