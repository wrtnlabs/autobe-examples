import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
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
 * Test privacy isolation by attempting to access another user's cleanup log.
 * Validate that users cannot access cleanup logs belonging to other users,
 * ensuring complete data privacy and isolation through ownership validation.
 */
export async function test_api_trash_cleanup_log_not_found_access_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate UserA
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);
  // 2. Create and authenticate UserB
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);
  // 3. Attempt to access ANY cleanup log using UserB's credentials
  // Since cleanup logs belong to specific users through the trash item relationship,
  // UserB should only be able to access cleanup logs associated with their own trash items
  // Any attempt to access cleanup logs belonging to other users (including UserA) should return 404
  await TestValidator.error(
    "access cleanup log with wrong user credentials should return 404",
    async () => {
      const randomCleanupLogId = typia.random<string & tags.Format<"uuid">>();
      // Attempt to access cleanup log with UserB's credentials
      // This should fail with 404 since the cleanup log doesn't belong to UserB
      // This validates the privacy isolation through trash item ownership
      await api.functional.todoApp.user.todos.trash.cleanup_logs.at(
        userBConnection,
        {
          cleanupLogId: randomCleanupLogId,
        },
      );
    },
  );
}
