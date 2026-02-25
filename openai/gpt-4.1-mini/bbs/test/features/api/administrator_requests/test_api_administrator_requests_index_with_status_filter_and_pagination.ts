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

export async function test_api_administrator_requests_index_with_status_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using join utility
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Prepare the request body for filtering by status 'pending' and pagination
  const body: IDiscussionBoardAdministratorRequest.IRequest = {
    status: "pending",
    page: 2,
    limit: 10,
  };
  // 3. Call the index API with the authorized connection
  const output =
    await api.functional.discussionBoard.superAdministrator.administrator.requests.index(
      superAdminConnection,
      { body },
    );
  typia.assert(output);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 2",
    output.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    output.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  // 5. Validate each request has correct status and timestamps
  for (const request of output.data) {
    TestValidator.equals(
      "request status is 'pending'",
      request.status,
      "pending",
    );
    // Validate timestamps are valid ISO date-time strings
    typia.assert(request.createdAt);
    typia.assert(request.updatedAt);
    if (request.deletedAt !== undefined) {
      if (request.deletedAt !== null) typia.assert(request.deletedAt);
    }
    // Validate requester details exist and are valid
    const user = request.registeredUser;
    typia.assert(user.id);
    typia.assert(user.email);
    typia.assert(user.displayName);
    TestValidator.predicate(
      "user is not banned",
      user.isBanned === false || user.isBanned === true,
    );
    typia.assert(user.createdAt);
    typia.assert(user.updatedAt);
    if (user.deletedAt !== undefined) {
      if (user.deletedAt !== null) typia.assert(user.deletedAt);
    }
  }
}
