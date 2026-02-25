import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshots_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // This E2E test verifies the PATCH /shoppingMall/administrator/sellerProfileSnapshots endpoint's pagination, sorting, filtering, and access control for administrator users.
  // 1. Prepare authorized administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Use the utility function to register a new administrator account for testing
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongPassword",
    },
  });
  // Inject token into adminConnection internally by utility
  // 2. Test data setup: create multiple snapshot query requests with different filters and pagination
  // Compose a baseline request without filters (default pagination)
  const defaultRequest: IShoppingMallSellerProfileSnapshot.IRequest = {
    offset: 0,
    limit: 10,
    page: 1,
  };
  // Fetch first page with default limit=10
  const firstPage =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
      adminConnection,
      { body: defaultRequest },
    );
  typia.assert(firstPage);
  // Validate pagination information matches request
  TestValidator.equals(
    "pagination.current page equals requested page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    firstPage.pagination.limit,
    10,
  );
  // page number is 1, offset is 0, data length can be up to 10
  TestValidator.predicate(
    "data length within limit",
    firstPage.data.length <= 10,
  );
  // 3. Fetch second page with offset 10, limit 5
  const secondRequest: IShoppingMallSellerProfileSnapshot.IRequest = {
    offset: 10,
    limit: 5,
    page: 3,
  };
  const secondPage =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
      adminConnection,
      { body: secondRequest },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination.current page equals requested page",
    secondPage.pagination.current,
    3,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    secondPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length within limit",
    secondPage.data.length <= 5,
  );
  // 4. Test filtering by shop name partial match if there is data available
  if (firstPage.data.length > 0) {
    const sampleNamePart = firstPage.data[0].shopName.substring(0, 3);
    const filterRequest: IShoppingMallSellerProfileSnapshot.IRequest = {
      shopName: sampleNamePart,
      limit: 10,
      offset: 0,
      page: 1,
    };
    const filteredPage =
      await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
        adminConnection,
        { body: filterRequest },
      );
    typia.assert(filteredPage);
    // Confirm all returned shop names contain the filter substring (case-insensitive)
    filteredPage.data.forEach((snapshot) => {
      TestValidator.predicate(
        `shopName includes: ${sampleNamePart}`,
        snapshot.shopName.toLowerCase().includes(sampleNamePart.toLowerCase()),
      );
    });
  }
  // 5. Test filtering by shop description partial match if available
  if (firstPage.data.length > 0) {
    const existingDesc = firstPage.data.find(
      (d) => d.shopDescription.length > 0,
    );
    if (existingDesc) {
      const sampleDescPart = existingDesc.shopDescription.substring(0, 4);
      const descFilterRequest: IShoppingMallSellerProfileSnapshot.IRequest = {
        shopDescription: sampleDescPart,
        limit: 5,
        offset: 0,
        page: 1,
      };
      const descFilteredPage =
        await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
          adminConnection,
          { body: descFilterRequest },
        );
      typia.assert(descFilteredPage);
      descFilteredPage.data.forEach((snapshot) => {
        TestValidator.predicate(
          `shopDescription includes: ${sampleDescPart}`,
          snapshot.shopDescription
            .toLowerCase()
            .includes(sampleDescPart.toLowerCase()),
        );
      });
    }
  }
  // 6. Test sorting by shopName ascending
  const sortedAscRequest: IShoppingMallSellerProfileSnapshot.IRequest = {
    limit: 10,
    offset: 0,
    page: 1,
  };
  const sortedAsc =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
      adminConnection,
      { body: sortedAscRequest },
    );
  typia.assert(sortedAsc);
  const sortedNames = sortedAsc.data.map((s) => s.shopName);
  // Check ascending order (strictly increasing or equal order)
  TestValidator.predicate(
    "shopName ascending order",
    sortedNames.every(
      (v, i, arr) => i === 0 || arr[i - 1].localeCompare(v) <= 0,
    ),
  );
  // 7. Test that only authorized admin can access endpoint
  const unauthConnection: api.IConnection = { host: connection.host };
  // Clear headers, no auth
  unauthConnection.headers = {};
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
      unauthConnection,
      { body: defaultRequest },
    );
  });
}
