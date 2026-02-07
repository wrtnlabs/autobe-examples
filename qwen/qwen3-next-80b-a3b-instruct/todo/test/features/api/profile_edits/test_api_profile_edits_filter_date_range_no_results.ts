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

export async function test_api_profile_edits_filter_date_range_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user
  const userConnection: api.IConnection = { host: connection.host };
  // User joins with empty body as ITodoAppUser.IJoin is an empty object
  const joinResult = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(joinResult);
  // Update connection with auth token from join
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: joinResult.token.access,
  };
  // Test filtering for edits that occurred in the future (after 2030)
  // This should return an empty data array since no display name edits exist
  const futureDate = new Date("2030-01-01T00:00:00Z").toISOString();
  const futureFilter: ITodoAppProfileEdit.IRequest = {
    created_at_start: futureDate,
  };
  const response = await api.functional.todoApp.user.profile.edits.patch(
    userConnection,
    {
      body: futureFilter,
    },
  );
  typia.assert(response);
  // Validate the response structure for empty results
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
