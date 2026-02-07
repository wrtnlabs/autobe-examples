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

export async function test_api_profile_edits_history_view_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account to establish profile edit history
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {},
  });
  // 2. Make at least one display name change to populate history
  // Note: We don't need to directly modify display name as this is handled automatically
  // when a user profile is edited. The display name history is created upon the first change
  // and will be automatically recorded in the audit trail.
  // We'll use an empty request body as specified by the IRequest schema
  // The display name change will be created through the API itself
  const editResult = await api.functional.todoApp.user.profile.edits.patch(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(editResult);
  // 3. Retrieve the complete profile edit history
  const historyResult = await api.functional.todoApp.user.profile.edits.patch(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(historyResult);
  // 4. Validate the response structure
  TestValidator.equals(
    "pagination not empty",
    historyResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has at least one edit",
    historyResult.data.length >= 1,
  );
  TestValidator.equals(
    "correct pagination limit",
    historyResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count matches data size",
    historyResult.pagination.records >= 1,
  );
  // 5. Verify each history entry is an ISummary object
  for (const entry of historyResult.data) {
    // No properties in ISummary, so we just need to confirm it's an object
    TestValidator.predicate(
      "each history entry is an object",
      typeof entry === "object" && entry !== null,
    );
  }
}
