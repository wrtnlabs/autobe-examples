import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
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
 * Test error handling when attempting to retrieve a non-existent trash item.
 *
 * This test validates that the system properly returns a 404 error when
 * attempting to retrieve a trash item that doesn't exist or doesn't belong
 * to the authenticated user. The test creates a user account, generates a
 * random UUID that doesn't correspond to any existing trash item, and
 * attempts to retrieve it via the trash API endpoint.
 */
export async function test_api_trash_view_not_found_trash_item(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Generate a random UUID that doesn't correspond to any existing trash item
  const nonExistentTrashItemId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent trash item and expect a 404 error
  await TestValidator.httpError(
    "retrieve non-existent trash item",
    404,
    async () => {
      await api.functional.todoApp.user.trash.at(userConnection, {
        trashItemId: nonExistentTrashItemId,
      });
    },
  );
}
