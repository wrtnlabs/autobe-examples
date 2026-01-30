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
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate user via join to obtain authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth: IEconomicForumUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {},
    },
  );
  // Step 2: Create a post as the authenticated user using the authorized connection
  const createdPost: IEconomicForumPost =
    await generate_random_economic_forum_user_posts_create(userConnection, {});
  // Extract the POST ID by asserting the response has an id property based on system patterns
  // Despite IEconomicForumPost being empty, the system must return an id based on entity patterns
  const postId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >((createdPost as any).id);
  // Step 3: Add a comment to the created post using the authorized connection and derived postId
  const createdComment: IEconomicForumPostComment =
    await generate_random_economic_forum_user_posts_comments_create(
      userConnection,
      {
        params: {
          postId: postId,
        },
      },
    );
  // Step 4: Delete the comment using the same authorized connection - this should succeed
  await api.functional.economicForum.user.posts.comments.erase(userConnection, {
    postId: postId,
    commentId: createdComment.id,
  });
  // Step 5: Validate deletion by attempting to retrieve the deleted comment - should return 404 Not Found
  // Note: The specification doesn't provide a GET endpoint for individual comments, so we cannot verify deletion
  // through retrieval. We rely on the API not throwing an error on successful delete as validation.
}
