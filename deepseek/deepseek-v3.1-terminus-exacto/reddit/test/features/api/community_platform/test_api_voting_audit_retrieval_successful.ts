import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
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

export async function test_api_voting_audit_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Test Admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Admin login to get proper authentication
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create vote to generate transaction
  const vote = await generate_random_community_platform_user_posts_votes_create(
    userConnection,
    {
      params: { postId: post.id },
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // The voting transaction ID should be the same as the vote ID since each vote creates a transaction
  // 6. Retrieve voting transaction audit record
  const transaction =
    await api.functional.communityPlatform.admin.voting_transactions.at(
      adminConnection,
      {
        transactionId: vote.id,
      },
    );
  typia.assert(transaction);
  // 7. Validate audit fields
  TestValidator.equals("transaction ID matches", transaction.id, vote.id);
  TestValidator.predicate(
    "operation type exists",
    () =>
      transaction.operation_type === "create" ||
      transaction.operation_type === "update" ||
      transaction.operation_type === "delete",
  );
  TestValidator.predicate(
    "vote type is valid",
    () =>
      transaction.vote_type === "upvote" ||
      transaction.vote_type === "downvote",
  );
  TestValidator.predicate(
    "karma impact is valid",
    () => transaction.karma_impact === 1 || transaction.karma_impact === -1,
  );
  TestValidator.predicate(
    "transaction timestamp exists",
    () =>
      typeof transaction.transaction_timestamp === "string" &&
      transaction.transaction_timestamp.length > 0,
  );
  TestValidator.predicate(
    "user relationship exists",
    () =>
      transaction.user.id === user.id &&
      transaction.user.username === user.username,
  );
}
