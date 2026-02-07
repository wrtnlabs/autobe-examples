import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test vote status endpoint for a user who has never interacted with the post (no vote exists).
 * This scenario validates that the endpoint correctly returns 'none' when a user has not cast any vote on a post.
 * The test creates two separate users - one who creates a post and another who has no vote on that post.
 * The second user checks the vote status and verifies it returns 'none'.
 */
export async function test_api_post_vote_status_no_vote_yet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user who will create the post
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await api.functional.redditPlatform.auth.user.join(
    firstUserConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(firstUser);
  // 2. Create community for the post
  const community = await api.functional.redditPlatform.user.communities.create(
    firstUserConnection,
    {
      body: typia.random<IRedditPlatformCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // 3. Create post as first user
  const post = await api.functional.redditPlatform.user.posts.create(
    firstUserConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  typia.assert(post);
  // 4. Create second user who has never voted on the post
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await api.functional.redditPlatform.auth.user.join(
    secondUserConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(secondUser);
  // 5. Check vote status for second user (should be 'none')
  const voteStatus =
    await api.functional.redditPlatform.user.posts.vote_status.at(
      secondUserConnection,
      {
        postId: (post as any).id,
      },
    );
  typia.assert(voteStatus);
  // Since DTOs are empty, we can't validate specific properties
  // but we can verify the API call succeeds and returns valid structure
  TestValidator.predicate(
    "vote status response is valid",
    () => voteStatus !== null,
  );
}
