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

export async function test_api_comment_vote_update_change_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first user (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // 2. Register second user (comment author) to avoid self-voting restriction
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // 3. Create a post for the comment
  const post = await api.functional.redditPlatform.posts.comments.create(
    authorConnection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        content: "Test post content",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a comment by the second user
  const comment = await api.functional.redditPlatform.posts.comments.create(
    authorConnection,
    {
      postId: (post as any).id,
      body: {
        content: "Test comment content",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 5. First user casts an upvote
  const upvote = await api.functional.redditPlatform.user.comment_votes.create(
    voterConnection,
    {
      body: {
        comment_id: (comment as any).id,
        vote_type: "upvote",
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("vote type is upvote", (upvote as any).vote_type, "upvote");
  // 6. First user changes vote to downvote
  const downvote =
    await api.functional.redditPlatform.user.comment_votes.create(
      voterConnection,
      {
        body: {
          comment_id: (comment as any).id,
          vote_type: "downvote",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvote);
  // 7. Verify vote_type is updated to downvote
  TestValidator.equals(
    "vote type updated to downvote",
    (downvote as any).vote_type,
    "downvote",
  );
  // 8. Verify vote record is updated rather than creating duplicate
  // Since this is the same [user_id, comment_id] combination, it should return the same record
  TestValidator.equals("same vote record", (downvote as any).id, (upvote as any).id);
}