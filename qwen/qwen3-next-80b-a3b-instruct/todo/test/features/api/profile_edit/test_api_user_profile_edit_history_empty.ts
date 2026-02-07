import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppProfileEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppProfileEdit";
import type { ITodoAppProfileEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfileEdit";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_edit_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user registration
  const userConnection: api.IConnection = { host: connection.host };
  // 1. User joins with no display name (IJoin is empty object)
  await authorize_user_join(userConnection, { body: {} });
  // 2. Call the profile edits endpoint
  const profileEdits =
    await api.functional.todoApp.user.profile.edits.get(userConnection);
  typia.assert(profileEdits);
  // 3. Validate response structure matches IPageITodoAppProfileEdit
  TestValidator.equals("data array length", profileEdits.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination.current",
    profileEdits.pagination.current,
    1,
  );
  TestValidator.equals("pagination.limit", profileEdits.pagination.limit, 20);
  TestValidator.equals(
    "pagination.records",
    profileEdits.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages", profileEdits.pagination.pages, 0);
}
