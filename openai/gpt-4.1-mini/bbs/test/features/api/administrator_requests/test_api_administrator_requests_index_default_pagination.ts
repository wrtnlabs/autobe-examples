import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_requests_index_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve super administrator credentials and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Use the authorized token connection
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdmin.token.access },
  };
  // Prepare request body for default pagination without status filter to test default to 'pending'
  const body: IDiscussionBoardAdministratorRequest.IRequest = {};
  // Call the administrator requests index endpoint
  const response =
    await api.functional.discussionBoard.superAdministrator.administrator.requests.index(
      authorizedConnection,
      { body },
    );
  // Validate the response structure
  typia.assert(response);
  // Validate the pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page number is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is >= 0", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records count is >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is >= 0",
    pagination.pages >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate(
    "response data should be array",
    Array.isArray(response.data),
  );
  // If data is not empty, validate each request item
  if (response.data.length > 0) {
    for (const req of response.data) {
      // Each request has status field which should be 'pending' since default filter
      TestValidator.equals(
        "request status is 'pending'",
        req.status,
        "pending",
      );
      // Validate each request structure
      typia.assert(req);
      // Validate registered user summary in the request
      typia.assert(req.registeredUser);
      // Registered user is not banned
      TestValidator.predicate(
        "registered user is not banned",
        req.registeredUser.isBanned === false,
      );
    }
  }
}
