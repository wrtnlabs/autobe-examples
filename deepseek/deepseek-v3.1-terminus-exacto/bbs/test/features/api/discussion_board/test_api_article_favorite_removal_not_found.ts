import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the scenario where a user attempts to delete a favorite that doesn't exist.
 * 1. Create a new user account via join operation
 * 2. Attempt to delete a non-existent favorite using an invalid UUID
 * 3. Verify the operation returns appropriate error status (404)
 * 4. Validate error message indicates favorite not found
 */
export async function test_api_article_favorite_removal_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Attempt to delete a non-existent favorite
  await TestValidator.httpError(
    "delete non-existent favorite",
    404,
    async () => {
      await api.functional.discussionBoard.user.article_favorites.erase(
        userConnection,
        {
          favoriteId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
