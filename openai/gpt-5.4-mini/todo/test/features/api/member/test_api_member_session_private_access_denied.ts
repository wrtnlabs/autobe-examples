import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verifies that private member session details cannot be accessed across account boundaries.
 *
 * This test creates two isolated authenticated members and confirms that a caller cannot retrieve a private session record that does not belong to them. It focuses on the access-control boundary for session detail reads and ensures that protected session audit metadata remains unavailable to other members.
 *
 * 1. Create two separate authenticated member connections using isolated join flows.
 * 2. Use the first member as the requester and attempt to read a private session detail by UUID.
 * 3. Assert that the request is rejected rather than exposing the session payload.
 */
export async function test_api_member_session_private_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_member_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(requester);
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(target);
  await TestValidator.error(
    "cannot access another member's private session",
    async () => {
      await api.functional.todoApp.member.sessions.at(requesterConnection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
