import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_registered_users_index_no_matching_filter_results(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator before requesting the registered users list
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Create filter request with a non-existent email to ensure no matching results
  const filterRequest: IDiscussionBoardRegisteredUser.IRequest = {
    email: typia.random<string & tags.Format<"email">>(), // Random email unlikely to exist
    page: 1,
    limit: 10,
  };
  // Call the registered users index endpoint with the filter
  const response = await api.functional.discussionBoard.registeredUsers.index(
    adminConnection,
    {
      body: filterRequest,
    },
  );
  // Assert the response fits the paginated summary type
  typia.assert(response);
  // Pagination metadata verification
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.equals("no records", response.pagination.records, 0);
  TestValidator.equals("pages is 0", response.pagination.pages, 0);
  // Confirm that the data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
}
