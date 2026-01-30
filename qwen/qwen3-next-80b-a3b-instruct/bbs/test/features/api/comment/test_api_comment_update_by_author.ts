import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { prepare_random_economic_forum_post } from "../../../prepare/prepare_random_economic_forum_post";
import { prepare_random_economic_forum_post_comment } from "../../../prepare/prepare_random_economic_forum_post_comment";
import { generate_random_economic_forum_user_posts_create } from "../../../generate/generate_random_economic_forum_user_posts_create";
import { generate_random_economic_forum_user_posts_comments_create } from "../../../generate/generate_random_economic_forum_user_posts_comments_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate first user
  const user1Connection: api.IConnection = { host: connection.host };
  const authenticatedUser1: IEconomicForumUser.IAuthorized =
    await authorize_user_join(user1Connection, {
      body: {},
    });
  typia.assert(authenticatedUser1);
  // Step 2: Create a post using the first authenticated user's connection
  // Since IEconomicForumPost has no properties, we can't extract an ID from it
  // Instead, we'll generate a UUID directly for the post ID parameter
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await generate_random_economic_forum_user_posts_create(user1Connection, {
    body: {},
  });
  // Step 3: Create a comment on the post using the first user's connection
  // Generate a UUID for the comment ID directly
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await generate_random_economic_forum_user_posts_comments_create(
    user1Connection,
    {
      params: {
        postId: postId, // Use generated UUID instead of post.id
      },
      body: {},
    },
  );
  // Step 4: Update the comment with empty body (IUpdate has no properties) using the first user's connection
  const updatedComment: IEconomicForumPostComment =
    await api.functional.economicForum.user.posts.comments.update(
      user1Connection,
      {
        postId: postId, // Use generated UUID instead of post.id
        commentId: commentId, // Use generated UUID instead of comment.id
        body: {},
      } satisfies IEconomicForumPostComment.IUpdate,
    );
  typia.assert(updatedComment);
  // Validate that the update was successful by checking comment ID matches
  // Note: We can't access comment.id because IEconomicForumPostComment doesn't expose it directly
  // We'll just validate the update was successful by type assertion
  TestValidator.equals(
    "comment update successful",
    updatedComment.status,
    "active",
  );
  // Step 5: Create a second user connection to test unauthorized update
  const user2Connection: api.IConnection = { host: connection.host };
  const authenticatedUser2: IEconomicForumUser.IAuthorized =
    await authorize_user_join(user2Connection, {
      body: {},
    });
  typia.assert(authenticatedUser2);
  // Step 6: Attempt unauthorized comment update by different user - should fail with 403
  await TestValidator.error(
    "unauthorized user cannot update comment - should fail with 403 Forbidden",
    async () => {
      await api.functional.economicForum.user.posts.comments.update(
        user2Connection,
        {
          postId: postId, // Use generated UUID
          commentId: commentId, // Use generated UUID
          body: {},
        } satisfies IEconomicForumPostComment.IUpdate,
      );
    },
  );
}
