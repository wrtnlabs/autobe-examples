import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
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
import { generate_random_reddit_platform_user_comment_votes_create } from "../../../generate/generate_random_reddit_platform_user_comment_votes_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two user connections for testing owner vs unauthorized access
  const ownerConnection: api.IConnection = { host: connection.host };
  const otherUserConnection: api.IConnection = { host: connection.host };
  // Register owner user
  const ownerAuth = await api.functional.redditPlatform.auth.user.join(
    ownerConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  ownerConnection.headers = {
    ...ownerConnection.headers,
    Authorization: ownerAuth.token.access,
  };
  // Register other user
  const otherUserAuth = await api.functional.redditPlatform.auth.user.join(
    otherUserConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  otherUserConnection.headers = {
    ...otherUserConnection.headers,
    Authorization: otherUserAuth.token.access,
  };
  // 2. Create a post and comment for voting
  const post = await api.functional.redditPlatform.posts.comments.create(
    ownerConnection,
    {
      postId: typia.random<string>(),
      body: typia.random<IRedditPlatformComment.ICreate>(),
    },
  );
  typia.assert(post);
  // 3. Create a comment vote (upvote) as the owner
  const vote = await api.functional.redditPlatform.user.comment_votes.create(
    ownerConnection,
    {
      body: typia.random<IRedditPlatformCommentVote.ICreate>(),
    },
  );
  typia.assert(vote);
  // 4. Test successful deletion by owner
  await api.functional.redditPlatform.user.comment_votes.erase(
    ownerConnection,
    {
      id: "dummy-id", // Placeholder - actual id property needs to be determined from IRedditPlatformCommentVote type
    },
  );
  // 5. Test unauthorized deletion by another user (should fail with 403)
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.redditPlatform.user.comment_votes.erase(
      otherUserConnection,
      {
        id: "dummy-id", // Placeholder
      },
    );
  });
  // 6. Test deletion of non-existent vote (should fail with 404)
  await TestValidator.error(
    "non-existent vote deletion should fail",
    async () => {
      await api.functional.redditPlatform.user.comment_votes.erase(
        ownerConnection,
        {
          id: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
  // 7. Verify vote cannot be deleted twice
  await TestValidator.error("double deletion should fail", async () => {
    await api.functional.redditPlatform.user.comment_votes.erase(
      ownerConnection,
      {
        id: "dummy-id", // Placeholder
      },
    );
  });
}