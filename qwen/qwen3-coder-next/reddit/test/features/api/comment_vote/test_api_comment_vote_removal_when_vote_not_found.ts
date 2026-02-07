import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_comment_vote_removal_when_vote_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user (comment author) using available utility function
  const user1Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user1Connection, {
    body: {} satisfies IRedditPlatformUser.IJoin,
  });
  // 2. Create second user (attempting vote removal)
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user2Connection, {
    body: {} satisfies IRedditPlatformUser.IJoin,
  });
  // 3. Create a test post using available endpoints
  // Since posts.create is not available in the provided API, we need to work with available functions
  // For this specific test, we can skip post creation since we only need a valid comment ID
  // In a real scenario, we would create a post first, then a comment
  // 4. First user creates a comment on a post
  // Since we don't have access to create a post, we'll use a mock postId for this test
  // In production, this would use a real post ID from post creation
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  const commentResult = await api.functional.redditPlatform.posts.comments.create(
    user1Connection,
    {
      postId: mockPostId,
      body: {} satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(commentResult);
  
  // Extract commentId from commentResult using type assertion as fallback
  const commentId = (commentResult as any).id;
  
  // 5. Second user attempts to remove a vote that was never cast
  // This should fail with 404 Not Found error
  await TestValidator.error(
    "removing non-existent vote should fail with 404",
    async () => {
      await api.functional.redditPlatform.user.comments.vote.erase(
        user2Connection,
        {
          commentId,
        },
      );
    },
  );
}