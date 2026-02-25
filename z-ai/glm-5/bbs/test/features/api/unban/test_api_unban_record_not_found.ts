import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
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
 * Test retrieval of a non-existent unban record.
 *
 * Create a user account, generate a random UUID that doesn't exist,
 * and attempt to retrieve an unban record with that UUID. Validate
 * that the API returns a 404 Not Found error.
 */
export async function test_api_unban_record_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Generate a random UUID that does not exist in the system
  const nonExistentUnbanId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent unban record and validate 404 error
  await TestValidator.httpError(
    "non-existent unban record should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.unbans.at(userConnection, {
        unbanId: nonExistentUnbanId,
      });
    },
  );
}
