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

export async function test_api_administrator_banned_users_pagination_paging_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 3: Pagination behavior with multiple pages of banned user data.
  // Verify boundary page requests (first, middle, last) and correct limit enforcement for page size.
  // Confirm that the results contain expected banned user summaries with both customers and sellers.
  // Ensure authorization by administrator join as prerequisite.
  // 1. Setup administrator and authorize to get adminConnection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Fetch first page with limit 10
  const firstPageRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallBannedUser.IRequest;
  const firstPage =
    await api.functional.shoppingMall.administrator.bannedUsers.index(
      adminConnection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata for first page
  TestValidator.predicate(
    "first page current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page size limit is 10",
    firstPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "first page records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // 3. If there are multiple pages, test middle and last pages
  if (firstPage.pagination.pages > 1) {
    // middle page is halfway rounded up if pages > 1
    const middlePageNumber = Math.floor(firstPage.pagination.pages / 2) + 1;
    // fetch middle page
    const middlePageRequest = {
      page: middlePageNumber,
      limit: 10,
    } satisfies IShoppingMallBannedUser.IRequest;
    const middlePage =
      await api.functional.shoppingMall.administrator.bannedUsers.index(
        adminConnection,
        {
          body: middlePageRequest,
        },
      );
    typia.assert(middlePage);
    TestValidator.predicate(
      "middle page current page matches",
      middlePage.pagination.current === middlePageNumber,
    );
    TestValidator.predicate(
      "middle page limit matches",
      middlePage.pagination.limit === 10,
    );
    // fetch last page
    const lastPageNumber = firstPage.pagination.pages;
    const lastPageRequest = {
      page: lastPageNumber,
      limit: 10,
    } satisfies IShoppingMallBannedUser.IRequest;
    const lastPage =
      await api.functional.shoppingMall.administrator.bannedUsers.index(
        adminConnection,
        {
          body: lastPageRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.predicate(
      "last page current page matches",
      lastPage.pagination.current === lastPageNumber,
    );
    TestValidator.predicate(
      "last page limit matches",
      lastPage.pagination.limit === 10,
    );
    // Validate that data arrays have length <= limit
    TestValidator.predicate(
      "middle page data length within limit",
      middlePage.data.length <= 10,
    );
    TestValidator.predicate(
      "last page data length within limit",
      lastPage.data.length <= 10,
    );
    // Check that banned user summaries contain expected properties
    for (const pageData of [middlePage.data, lastPage.data]) {
      for (const bannedUser of pageData) {
        // Must have id, banReason, createdAt, updatedAt
        typia.assert(bannedUser.id);
        typia.assert(bannedUser.banReason);
        typia.assert(bannedUser.createdAt);
        typia.assert(bannedUser.updatedAt);
        // Either customer or seller must be non-null
        TestValidator.predicate(
          "banned user has customer or seller",
          bannedUser.customer !== null || bannedUser.seller !== null,
        );
      }
    }
  }
  // 4. Check first page user types exist with customer and seller
  let hasCustomer = false;
  let hasSeller = false;
  for (const bannedUser of firstPage.data) {
    if (bannedUser.customer !== null) hasCustomer = true;
    if (bannedUser.seller !== null) hasSeller = true;
  }
  TestValidator.predicate("first page has banned customers", hasCustomer);
  TestValidator.predicate("first page has banned sellers", hasSeller);
  // 5. Check limit enforcement (try limit=5, page=1)
  const limit5Request = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallBannedUser.IRequest;
  const limit5Page =
    await api.functional.shoppingMall.administrator.bannedUsers.index(
      adminConnection,
      {
        body: limit5Request,
      },
    );
  typia.assert(limit5Page);
  TestValidator.predicate("limit=5 enforced", limit5Page.data.length <= 5);
}
