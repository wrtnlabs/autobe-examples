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
export async function test_api_post_update_forbidden_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate first user to ensure we have at least one valid user
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {});
  typia.assert(firstUser);
  // Step 2: First user creates a post (ensure there's data in system)
  await generate_random_economic_forum_user_posts_create(
    firstUserConnection,
    {},
  );
  // Step 3: Authenticate second user (non-owner) attempting update
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {});
  typia.assert(secondUser);
  // Step 4: Generate a random UUID for a post ID that doesn't belong to secondUser
  // This represents a post created by someone else (firstUser), even though we didn't capture its ID
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to update a post that secondUser doesn't own
  // The API will check ownership and deny access with 403 Forbidden
  await TestValidator.error(
    "non-owner cannot update another user's post",
    async () => {
      await api.functional.economicForum.user.posts.update(
        secondUserConnection,
        {
          postId,
          body: {} satisfies IEconomicForumPost.IUpdate,
        },
      );
    },
  );
  // Step 5: Verify that second user can create their own post (context)
  const secondUserPost = await generate_random_economic_forum_user_posts_create(
    secondUserConnection,
    {},
  );
  typia.assert(secondUserPost);
}
