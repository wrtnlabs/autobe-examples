import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

// Test retrieving the details of an existing administrator privilege request by a super administrator.
// The test should validate that the request can successfully retrieve all relevant information including the request reason, status, timestamps, and associated registered user details.
// Also verify that the response contains all required fields.
// The authorization prerequisites include prior administrator account creation and login via the join endpoint for authentication.
export async function test_api_administrator_request_detail_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for administrator joining
  const adminConnection: api.IConnection = { host: connection.host };
  // Join admin and authorize
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // adminConnection.headers is updated internally with Authorization by authorize_administrator_join
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // Because there is no API to create a new AdministratorRequest,
  // generate a random UUID as requestId to perform retrieval
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve AdministratorRequest detail
  const response: IDiscussionBoardAdministratorRequest =
    await api.functional.discussionBoard.administrator.administratorRequests.at(
      adminConnection,
      { requestId },
    );
  // Assert the type of the response
  typia.assert(response);
}
