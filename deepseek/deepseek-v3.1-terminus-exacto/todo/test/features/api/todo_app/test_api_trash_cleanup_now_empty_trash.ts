import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_cleanup_now_empty_trash(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Call cleanup operation on empty trash
  const cleanupResult =
    await api.functional.todoApp.user.trash.cleanup.now.cleanupNow(
      userConnection,
    );
  typia.assert(cleanupResult);
  // Validate cleanup statistics
  TestValidator.equals(
    "items processed should be 0",
    cleanupResult.items_processed,
    0,
  );
  TestValidator.equals(
    "items deleted should be 0",
    cleanupResult.items_deleted,
    0,
  );
  TestValidator.equals(
    "error message should be null",
    cleanupResult.error_message,
    null,
  );
  TestValidator.predicate(
    "completion timestamp should be set",
    cleanupResult.completed_at !== null,
  );
}
