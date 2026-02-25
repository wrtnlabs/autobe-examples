import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBannedUser";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator connection with join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_administrator_join utility to create and authorize admin
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "adminPassword123",
    },
  });
  // Update adminConnection headers with authorization token
  adminConnection.headers ||= {};
  adminConnection.headers["Authorization"] =
    `Bearer ${adminAuthorized.token.access}`;
  // 2. Prepare filter criteria for bannedUsers with banReason keyword and date ranges
  // We will create various bannedUsers entries manually for realistic filter test
  // However, as no creation API for bannedUsers is provided, we simulate by querying with filters
  // Using an expected ban reason keyword and date range
  // For testing, generate sensitive dates and reason keyword
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const banReasonKeyword = RandomGenerator.substring(
    "This user violated rules due to repeated offenses of spamming.",
  );
  // Compose request body with parameters matching scenario requirements
  const requestBody: IShoppingMallBannedUser.IRequest = {
    banReason: banReasonKeyword,
    createdAfter: oneMonthAgo.toISOString(),
    createdBefore: now.toISOString(),
    updatedAfter: oneMonthAgo.toISOString(),
    updatedBefore: now.toISOString(),
    page: 1,
    limit: 10,
    sort: "createdAtDesc",
  };
  // 3. Call the bannedUsers index endpoint with filters
  const response =
    await api.functional.shoppingMall.administrator.bannedUsers.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // 4. Validate response type
  typia.assert(response);
  // 5. Validate response pagination
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  // 6. Validate each banned user in the list
  for (const bannedUser of response.data) {
    // Must have banReason including the keyword
    TestValidator.predicate(
      `banReason includes keyword '${banReasonKeyword}'`,
      bannedUser.banReason
        .toLowerCase()
        .includes(banReasonKeyword.toLowerCase()),
    );
    // Must have createdAt in the date range
    const createdAtDate = new Date(bannedUser.createdAt);
    TestValidator.predicate(
      "createdAt in filter range",
      createdAtDate.getTime() >= oneMonthAgo.getTime() &&
        createdAtDate.getTime() <= now.getTime(),
    );
    // Must have updatedAt in the date range
    const updatedAtDate = new Date(bannedUser.updatedAt);
    TestValidator.predicate(
      "updatedAt in filter range",
      updatedAtDate.getTime() >= oneMonthAgo.getTime() &&
        updatedAtDate.getTime() <= now.getTime(),
    );
  }
  // 7. Validate sorting order by createdAt descending
  for (let i = 1; i < response.data.length; ++i) {
    const prev = new Date(response.data[i - 1].createdAt);
    const curr = new Date(response.data[i].createdAt);
    TestValidator.predicate(
      "createdAt descending order",
      prev.getTime() >= curr.getTime(),
    );
  }
  // 8. Authorization enforced is indirectly validated by success of the call with admin token
  // Cannot access this endpoint without admin token, so success means authorization passed
}
