import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_list_filter_by_email(
  connection: api.IConnection,
) {
  // Create new user connection to join
  const joinConnection: api.IConnection = { host: connection.host };
  // 1. Join new registered user
  const authorized = await authorize_registered_user_join(joinConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Call registered users index with empty filter (since IRequest is empty)
  const response =
    await api.functional.discussionBoard.registeredUser.registeredUsers.index(
      userConnection,
      { body: {} },
    );
  typia.assert(response);
  // 4. Validate pagination fields
  TestValidator.predicate(
    "pagination current page > 0",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages > 0",
    response.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records > 0",
    response.pagination.records > 0,
  );
  // 5. Validate data array
  TestValidator.predicate(
    "data array is not empty",
    Array.isArray(response.data) && response.data.length > 0,
  );
  // 6. Since summary has no details, check just presence of data items
  TestValidator.predicate(
    "summary items present",
    response.data.every((item) => item !== null),
  );
}
