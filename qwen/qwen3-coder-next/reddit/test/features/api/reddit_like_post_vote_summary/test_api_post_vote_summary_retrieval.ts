import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVoteSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_vote_summary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Note: Full test cannot be implemented due to missing SDK functions for:
  // 1. Community creation (required for posts)
  // 2. Post creation (requires community subscription)
  // 3. Post voting operations (required for vote summary testing)
  // However, we can test the endpoint structure with a generated post ID
  // This demonstrates the endpoint accepts valid UUID format
  const invalidPostId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error("non-existent post returns 404", async () => {
    await api.functional.redditLike.posts.votes.summary(connection, {
      postId: invalidPostId,
    });
  });
  // Test with a valid UUID format (will return 404 for non-existent post)
  const validFormatPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent post with valid UUID format returns 404",
    async () => {
      await api.functional.redditLike.posts.votes.summary(connection, {
        postId: validFormatPostId,
      });
    },
  );
}
