import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_user_unban_retrieve_non_existent_record(
  connection: api.IConnection,
): Promise<void> {
  // Test case to verify the behavior when an administrator attempts to retrieve user unban details with a non-existent unbanId:
  // 1. Authenticate by administrator registration.
  // 2. Call GET /discussionBoard/administrator/userUnbans/{unbanId} with a UUID that does not correspond to any user unban record.
  // 3. Confirm that the response status is 404 Not Found.
  // 4. Verify the error message is informative and consistent.
  // 5. Ensure no sensitive data is exposed.
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Generate a random UUID that does not correspond to any user unban record
  const invalidUnbanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the user unban details with the non-existent unbanId
  await TestValidator.httpError(
    "retrieve non-existent user unban record",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.userUnbans.at(
        adminConnection,
        {
          unbanId: invalidUnbanId,
        },
      );
    },
  );
}
