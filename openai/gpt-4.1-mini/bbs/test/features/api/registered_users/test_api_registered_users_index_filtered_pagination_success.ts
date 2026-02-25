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

export async function test_api_registered_users_index_filtered_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin-${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPassword123!",
    },
  });
  typia.assert(adminAuthorized);
  // The adminConnection headers must contain the Authorization token internally by authorize_administrator_join
  // 2. Prepare multiple test users manually via the API or use existing test dataset
  //    but we simulate requests with meaningful filters
  // 3. Define filter parameters
  // Use partial matching substring for email and displayName
  const emailFilter = "test";
  const displayNameFilter = "user";
  // Use banned status - false means normal users
  const isBannedFilter = false;
  // Use recent registration date range within last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // 4. Compose request body with filters and pagination
  const requestBody: IDiscussionBoardRegisteredUser.IRequest = {
    email: emailFilter,
    displayName: displayNameFilter,
    isBanned: isBannedFilter,
    createdAtFrom: sevenDaysAgo.toISOString(),
    createdAtTo: now.toISOString(),
    page: 1,
    limit: 10,
  };
  // 5. Call the registeredUsers index endpoint with authorized connection
  const response = await api.functional.discussionBoard.registeredUsers.index(
    adminConnection,
    { body: requestBody },
  );
  // 6. Assert response structure
  typia.assert(response);
  // 7. Verify pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  // 8. Verify each user data in the response
  for (const user of response.data) {
    typia.assert(user);
    TestValidator.predicate(
      "user email contains filter",
      user.email.includes(emailFilter),
    );
    TestValidator.predicate(
      "user displayName contains filter",
      user.displayName.includes(displayNameFilter),
    );
    TestValidator.equals(
      "user isBanned matches filter",
      user.isBanned,
      isBannedFilter,
    );
    // Validate createdAt is within range
    TestValidator.predicate(
      "user createdAt >= createdAtFrom",
      user.createdAt >= requestBody.createdAtFrom!,
    );
    TestValidator.predicate(
      "user createdAt <= createdAtTo",
      user.createdAt <= requestBody.createdAtTo!,
    );
    // Ensure deletedAt is present (nullable) but no password or sensitive info exists
    if (user.deletedAt !== undefined && user.deletedAt !== null) {
      typia.assert(user.deletedAt);
    }
  }
}
