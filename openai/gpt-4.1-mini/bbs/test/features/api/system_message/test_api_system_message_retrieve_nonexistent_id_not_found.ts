import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_message_retrieve_nonexistent_id_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to retrieve a system message using a UUID that does not exist in the system.
  // The request is made with admin authorization.
  // We expect an HTTP 404 error with a message about the missing resource.
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize administrator account join and get auth token applied internally
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password",
    },
  });
  // Generate a random UUID that is very unlikely to exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Expect api call to throw HttpError with status 404
  await TestValidator.httpError(
    "non-existent system message retrieval",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.at(
        adminConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
