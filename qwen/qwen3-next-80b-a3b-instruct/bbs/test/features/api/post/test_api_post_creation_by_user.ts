import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { prepare_random_economic_forum_post } from "../../../prepare/prepare_random_economic_forum_post";
import { generate_random_economic_forum_user_posts_create } from "../../../generate/generate_random_economic_forum_user_posts_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_post_creation_by_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user via join
  const userConnection: api.IConnection = { host: connection.host };
  const authenticatedUser: IEconomicForumUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {},
    });
  // userConnection.headers is now updated with the authentication token
  // Step 2: Prepare realistic post creation data using appropriate random generators
  // Title must be a descriptive phrase
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  // Step 3: Create the post using authenticated user connection
  const createdPost: IEconomicForumPost =
    await api.functional.economicForum.user.posts.create(userConnection, {
      body: {
        title: postTitle,
      } satisfies IEconomicForumPost.ICreate,
    });
  // Step 4: Validate the created post with typia.assert() - this validates everything
  typia.assert(createdPost);
}
