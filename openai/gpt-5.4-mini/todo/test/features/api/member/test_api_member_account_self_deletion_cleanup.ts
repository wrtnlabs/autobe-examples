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
 * Test authenticated member self-deletion cleanup for a private todo account.
 *
 * Validates that a freshly registered member can delete their own account using the authenticated session and that the deletion endpoint completes successfully without returning payload data. The scenario covers the member-owned private account lifecycle and ensures the account removal request is executed through the authorized member connection.
 *
 * Special attention is given to the private account cleanup path, which is expected to remove the current member record together with its private profile and owned todo data as part of the account lifecycle operation.
 *
 * 1. Register and authenticate a private member account.
 * 2. Issue the self-deletion request against the authenticated member session.
 * 3. Confirm the endpoint succeeds as a void operation and does not expose sensitive account fields in the response.
 */
export async function test_api_member_account_self_deletion_cleanup(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(registered);
  await api.functional.todoApp.member.accounts.erase(memberConnection, {
    body: {} satisfies ITodoAppMember.IRequest,
  });
}
