import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_discussion_board_registered_user_comments_list_varied_filters_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and create a user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(connection, {
    body: {},
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // Scenario 1: Retrieve comment list with default pagination, no filters/sorting
  const defaultResponse = typia.assert(
    await api.functional.discussionBoard.registeredUser.comments.index(
      userConnection,
      {
        body: {},
      },
    ),
  );
  // Validate pagination metadata exists and is non-negative
  TestValidator.predicate(
    "pagination current page >= 0",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    defaultResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    defaultResponse.pagination.pages >= 0,
  );
  // Scenario 2: Retrieve comment list with pagination parameters only (no filters due to schema emptiness)
  const pageTwoResponse = typia.assert(
    await api.functional.discussionBoard.registeredUser.comments.index(
      userConnection,
      {
        body: {
          // If pagination properties existed, could specify; otherwise empty
        },
      },
    ),
  );
  TestValidator.predicate(
    "pagination current page >= 0",
    pageTwoResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    pageTwoResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    pageTwoResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    pageTwoResponse.pagination.pages >= 0,
  );
  // Scenario 3: Retrieve comments again with empty body, no filter, no sort (schema lacks these props)
  const noFilterResponse = typia.assert(
    await api.functional.discussionBoard.registeredUser.comments.index(
      userConnection,
      {
        body: {},
      },
    ),
  );
  TestValidator.predicate(
    "pagination current page >= 0",
    noFilterResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    noFilterResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    noFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    noFilterResponse.pagination.pages >= 0,
  );
}
