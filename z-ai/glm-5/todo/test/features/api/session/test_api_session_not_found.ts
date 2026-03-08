import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(memberConnection, {});
  // 2. Generate a random UUID that does not exist in the system
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the API with non-existent session ID and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () => {
      await api.functional.todoApp.guest.sessions.at(memberConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
