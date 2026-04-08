import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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
 * Verifies that member login rejects an email that is not registered.
 *
 * This scenario covers the private authentication boundary for the todo app.
 * It first creates a valid member account to ensure the authentication system is available, then submits login credentials with a different email address while keeping the password in a valid format. The test confirms that the API responds with a generic authentication failure without revealing whether the email exists and without issuing authorization tokens or an authorized member payload.
 *
 * 1. Register a valid member account using the join utility and an actor-specific connection.
 * 2. Attempt login with a non-existent email and a valid password format.
 * 3. Confirm the operation fails with a generic authentication error.
 * 4. Ensure no authorized payload is returned for unknown member accounts.
 */
export async function test_api_member_login_unknown_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const unknownEmail = `unknown-${RandomGenerator.alphabets(8)}@example.com`;
  await TestValidator.httpError(
    "member login with unknown email should be rejected",
    [400, 401],
    async () => {
      await authorize_member_login(memberConnection, {
        body: {
          email: unknownEmail,
          password: typia.random<string & tags.Format<"password">>(),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
}
