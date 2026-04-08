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

export async function test_api_member_account_post_deletion_sign_in_blocked(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that deleting a member account ends its lifecycle and blocks reuse of the same credentials.
   *
   * This test covers the private account deletion flow for the todo application.
   * It creates a fresh member account, deletes the currently signed-in account, and then
   * verifies the deleted email can no longer be reused for a new account creation attempt.
   *
   * 1. Register a unique member account and capture the credentials.
   * 2. Delete the authenticated member account through the account erasure endpoint.
   * 3. Attempt to register another account with the same email and expect rejection.
   */
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Test1234!" satisfies string & tags.Format<"password">;
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  await api.functional.todoApp.member.accounts.erase(memberConnection, {
    body: {} satisfies ITodoAppMember.IRequest,
  });
  const duplicateJoinConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "deleted member account email should not be reusable",
    async () => {
      await authorize_member_join(duplicateJoinConnection, {
        body: {
          email,
          password,
        } satisfies ITodoAppMember.IJoin,
      });
    },
  );
}
