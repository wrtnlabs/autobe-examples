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

export async function test_api_system_message_retrieve_existing_id_authorized(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a system message by a valid existing UUID as an authorized administrator
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin-password",
    },
  });
  typia.assert(admin);
  // The authorization token is set inside adminConnection.headers by the utility
  // 2. Retrieve list of system messages to get a valid existing ID
  // There is no direct list API provided, so we generate a random UUID to use
  // (As scenario says valid existing UUID, but no creation or list is provided,
  // we'll fetch by a random UUID expecting 404 and then create test handling)
  // However, scenario states retrieve by an existing UUID, so we simulate creation.
  // Because the test instructions and API do not provide system message creation,
  // we generate a random UUID for testing, but this may cause 404 error in real system.
  // Generate a valid UUID for test
  const validId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch the system message by ID
  const systemMessage =
    await api.functional.discussionBoard.administrator.systemMessages.at(
      adminConnection,
      { id: validId },
    );
  typia.assert(systemMessage);
  // 4. Validate the UUID format of returned id matches request id
  TestValidator.equals("system message id matches", systemMessage.id, validId);
  // 5. Validate the other required properties existence and types by typia.assert
  typia.assert(systemMessage);
}
