import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function test_api_system_message_update_code_conflict_error(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to update a system message with a duplicate 'code' field causing a uniqueness conflict.
  // This test ensures that when an administrator attempts to update the system message template's code to one that already exists in another record,
  // the API properly rejects the request and returns a conflict error.
  // The test validates conflict detection and proper error messaging while the administrator is authenticated.
  // 1. Administrator registration and authentication using utility
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create two distinct system messages with unique codes
  // Use the update API to create messages is not possible, so we simulate creating by updating two different UUIDs
  // We simulate by generating random valid UUIDs and unique codes.
  // Generate two distinct system message IDs
  const id1 = typia.random<string & tags.Format<"uuid">>();
  let code1 = RandomGenerator.alphabets(10);
  const body1: IDiscussionBoardSystemMessage.IUpdate = {
    code: code1,
    message_text: RandomGenerator.paragraph({ sentences: 3 }),
    message_type: "error",
    deleted_at: null,
  };
  const message1 =
    await api.functional.discussionBoard.administrator.systemMessages.update(
      adminConnection,
      { id: id1, body: body1 },
    );
  typia.assert(message1);
  // Create second system message with distinct code
  const id2 = typia.random<string & tags.Format<"uuid">>();
  let code2 = RandomGenerator.alphabets(10);
  while (code2 === code1) {
    // Just in case randomly same code generated, regenerate
    code2 = RandomGenerator.alphabets(10);
  }
  const body2: IDiscussionBoardSystemMessage.IUpdate = {
    code: code2,
    message_text: RandomGenerator.paragraph({ sentences: 2 }),
    message_type: "info",
    deleted_at: null,
  };
  const message2 =
    await api.functional.discussionBoard.administrator.systemMessages.update(
      adminConnection,
      { id: id2, body: body2 },
    );
  typia.assert(message2);
  // 3. Attempt to update the second system message's code to the first one's code
  // Construct conflictBody only with properties that exist on IUpdate
  const conflictBody: Partial<IDiscussionBoardSystemMessage.IUpdate> = {
    code: code1, // duplicate code
    deleted_at: null,  // keep as is
  };
  // 4. Verify that a conflict error is thrown on update
  await TestValidator.httpError("duplicate code conflict", 409, async () => {
    await api.functional.discussionBoard.administrator.systemMessages.update(
      adminConnection,
      { id: id2, body: conflictBody },
    );
  });
}
