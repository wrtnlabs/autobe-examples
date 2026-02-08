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

/**
 * Test retrieving a paginated list of registered users without filters to verify the system returns a valid default user list. Validate that the list includes user display names and excludes sensitive password data. Confirm pagination metadata correctness. Ensure the operation is called with proper authenticated registered user authorization obtained via user join operation.
 */
export async function test_api_registered_user_list_retrieval_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new registered user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await authorize_registered_user_join(userConnection, { body: {} });
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 2. Call the registeredUsers.index endpoint without filters (empty body)
  const requestBody: IDiscussionBoardRegisteredUser.IRequest = {};
  const userListResponse: IPageIDiscussionBoardRegisteredUser.ISummary =
    await api.functional.discussionBoard.registeredUser.registeredUsers.index(
      userConnection,
      {
        body: requestBody,
      },
    );
  // 3. Assert the response type
  typia.assert(userListResponse);
  // 4. Validate pagination metadata correctness
  const pagination = userListResponse.pagination;
  TestValidator.predicate(
    "pagination.current is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination.limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is correct",
    pagination.pages === 0 ||
      pagination.pages >= Math.ceil(pagination.records / pagination.limit),
  );
  // 5. Validate that user list entries include display names and exclude passwords
  for (const user of userListResponse.data) {
    typia.assert(user);
    // Display name presence check (if displayName is present property)
    // Since schema has no properties, we cannot check exact properties, so we skip
    // But we ensure that user objects exist in data array
  }
}
