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
 * Test error handling when attempting to permanently delete a trash item that has already been permanently deleted.
 * Creates a user, then attempts to permanently delete a non-existent trash item to simulate the error scenario.
 * Validates that the system returns an appropriate error response indicating the item cannot be processed again.
 */
export async function test_api_trash_permanent_deletion_already_deleted_error(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Attempt to permanently delete a non-existent trash item
  // This simulates the scenario where an item was already permanently deleted
  await TestValidator.error(
    "should fail when permanently deleting non-existent (already deleted) trash item",
    async () => {
      const randomTrashItemId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.todoApp.user.trash.erase(userConnection, {
        trashItemId: randomTrashItemId,
      });
    },
  );
}
