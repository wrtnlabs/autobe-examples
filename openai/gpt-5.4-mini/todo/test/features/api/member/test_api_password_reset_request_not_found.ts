import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
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
 * Test that an unavailable password reset request is rejected as not found.
 *
 * Verifies the private member recovery lookup rejects a missing reset record
 * when queried with a random UUID that does not correspond to any stored
 * password reset request. This checks the lifecycle behavior for inaccessible
 * reset requests and ensures the endpoint does not leak password reset data
 * when the record is absent.
 *
 * 1. Register an authenticated member using an isolated actor connection.
 * 2. Request a password reset record by a random UUID resetId that should not exist.
 * 3. Confirm the lookup fails with a not-found HTTP error.
 */
export async function test_api_password_reset_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
    } satisfies ITodoAppMember.IJoin,
  });
  const resetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing password reset request should return not found",
    404,
    async () => {
      await api.functional.todoApp.member.password_resets.at(memberConnection, {
        resetId,
      });
    },
  );
}
