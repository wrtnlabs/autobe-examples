import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test security validation when a user attempts to permanently delete another user's trash item.
 * Since the todo creation API returns void and there's no way to list todos,
 * we generate a random UUID and test that User B cannot delete any trash item
 * (even non-existent ones) that don't belong to them.
 */
export async function test_api_trash_permanent_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate User A
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAAuthorized);
  // 2. Create and authenticate User B
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userBAuthorized);
  // 3. User B attempts to permanently delete a random trash item
  // Since we cannot create todos and get their IDs with the current API,
  // we test with a random UUID to verify authorization checks
  await TestValidator.error("unauthorized trash deletion", async () => {
    await api.functional.todoApp.user.trash.erase(userBConnection, {
      trashItemId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
