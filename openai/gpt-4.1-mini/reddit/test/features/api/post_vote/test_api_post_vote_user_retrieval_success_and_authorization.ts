import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
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
import { generate_random_community_platform_user_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_user_posts_votes_create_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_user_retrieval_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test scenario for retrieving a user's vote record by postVoteId with authorization and data integrity verification.
   *
   * Steps:
   * 1. Register and authorize a user (user1).
   * 2. User1 creates a community.
   * 3. User1 creates a post in the community.
   * 4. User1 casts a vote on the post.
   * 5. User1 retrieves the vote record by postVoteId successfully.
   * 6. Register and authorize another user (user2).
   * 7. User2 attempts to retrieve the vote record of user1 by postVoteId and is denied (403).
   * 8. User2 attempts to retrieve a non-existent vote record by fake postVoteId and gets not found (404).
   */
  // 1. Register and authorize user1
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Authorized = await authorize_user_join(user1Connection, {});
  user1Connection.headers = { Authorization: user1Authorized.token.access };
  typia.assert<ICommunityPlatformUser.IAuthorized>(user1Authorized);
  // 2. User1 creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      user1Connection,
      { body: { name: `community-${RandomGenerator.alphaNumeric(6)}` } },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  // 3. User1 creates a post in the community
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 10 }),
  } as any; // Using 'any' cast to bypass union typing uncertainty
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      user1Connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert<ICommunityPlatformPost>(post);
  // 4. User1 casts a vote on the post
  const postVote =
    await generate_random_community_platform_user_posts_votes_create_vote(
      user1Connection,
      {
        params: { postId: post.id },
        body: { post_id: post.id, vote_type: "upvote" },
      },
    );
  typia.assert<ICommunityPlatformPostVote>(postVote);
  // 5. User1 retrieves the vote record by postVoteId successfully
  const userVoteRecord =
    await api.functional.communityPlatform.user.postVotes.users.at(
      user1Connection,
      {
        postVoteId: (postVote as unknown as IEntity).id,
      },
    );
  typia.assert<ICommunityPlatformPostVoteOfUser>(userVoteRecord);
  TestValidator.equals("postVote id matches", userVoteRecord.id, (postVote as unknown as IEntity).id);
  TestValidator.equals(
    "postVote vote_type matches",
    userVoteRecord.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "postVoteOfUser postVote id matches",
    (userVoteRecord.postVote as unknown as IEntity).id,
    (postVote as unknown as IEntity).id,
  );
  TestValidator.predicate(
    "postVoteOfUser created_at valid",
    new Date(userVoteRecord.created_at).toISOString() ===
      userVoteRecord.created_at,
  );
  TestValidator.predicate(
    "postVoteOfUser updated_at valid",
    new Date(userVoteRecord.updated_at).toISOString() ===
      userVoteRecord.updated_at,
  );
  // 6. Register and authorize user2
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Authorized = await authorize_user_join(user2Connection, {});
  user2Connection.headers = { Authorization: user2Authorized.token.access };
  typia.assert<ICommunityPlatformUser.IAuthorized>(user2Authorized);
  // 7. User2 attempts to retrieve user1's vote record and should get access denied error (403)
  await TestValidator.httpError("unauthorized access denied", 403, async () => {
    await api.functional.communityPlatform.user.postVotes.users.at(
      user2Connection,
      {
        postVoteId: userVoteRecord.id,
      },
    );
  });
  // 8. User2 attempts to retrieve a non-existent vote record, should get not found error (404)
  await TestValidator.httpError("vote record not found", 404, async () => {
    await api.functional.communityPlatform.user.postVotes.users.at(
      user2Connection,
      {
        postVoteId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
