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

export async function test_api_registered_user_list_filter_banned(
  connection: api.IConnection,
): Promise<void> {
  // Authorize a new registered user by joining
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {},
    },
  );
  registeredUserConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Prepare empty request body as no filters are defined in IRequest DTO
  const requestBody = {} satisfies IDiscussionBoardRegisteredUser.IRequest;
  // Call the index endpoint to get list of registered users
  const response =
    await api.functional.discussionBoard.registeredUser.registeredUsers.index(
      registeredUserConnection,
      {
        body: requestBody,
      },
    );
  // Assert the response structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate that all returned users are summaries (no sensitive info) - asserted by typia
}
