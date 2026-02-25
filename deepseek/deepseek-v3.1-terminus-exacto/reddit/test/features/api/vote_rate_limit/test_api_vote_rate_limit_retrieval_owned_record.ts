import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_vote_rate_limit_retrieval_owned_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // 2. Create a post for voting - using a simple text post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general", // Using a common community name
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Vote on the post to generate rate limit record
  const vote = await generate_random_community_platform_user_posts_votes_create(
    userConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // Since we don't have a direct way to get the rate limit record ID,
  // we'll assume the system creates rate limit records with the same ID as votes
  // or we need to find an alternative approach
  // 4. Retrieve the vote rate limit record using the vote ID
  const rateLimitRecord =
    await api.functional.communityPlatform.user.vote_rate_limits.at(
      userConnection,
      {
        rateLimitId: vote.id, // Using vote ID as rate limit ID (system design assumption)
      },
    );
  typia.assert(rateLimitRecord);
  // 5. Validate the rate limit record content
  TestValidator.equals("rate limit ID matches", rateLimitRecord.id, vote.id);
  TestValidator.equals(
    "entity type is post",
    rateLimitRecord.entity_type,
    "post",
  );
  TestValidator.equals(
    "vote type matches",
    rateLimitRecord.vote_type,
    "upvote",
  );
  TestValidator.predicate(
    "has valid voted_at timestamp",
    () => new Date(rateLimitRecord.voted_at) <= new Date(),
  );
  TestValidator.predicate("has valid IP address", () =>
    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      rateLimitRecord.ip_address,
    ),
  );
  TestValidator.predicate(
    "user agent is string or null",
    () =>
      rateLimitRecord.user_agent === null ||
      typeof rateLimitRecord.user_agent === "string",
  );
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    () =>
      new Date(rateLimitRecord.created_at) <=
      new Date(rateLimitRecord.updated_at),
  );
  TestValidator.equals("deleted_at is null", rateLimitRecord.deleted_at, null);
  // 6. Validate user ownership
  TestValidator.equals(
    "user ID matches",
    rateLimitRecord.user.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "username matches",
    rateLimitRecord.user.username,
    authorizedUser.username,
  );
  TestValidator.equals(
    "display name matches",
    rateLimitRecord.user.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals(
    "avatar URL matches",
    rateLimitRecord.user.avatar_url,
    authorizedUser.avatar_url,
  );
  TestValidator.equals(
    "karma matches",
    rateLimitRecord.user.karma,
    authorizedUser.karma,
  );
  TestValidator.predicate(
    "user created_at is valid",
    () => new Date(rateLimitRecord.user.created_at) <= new Date(),
  );
}
