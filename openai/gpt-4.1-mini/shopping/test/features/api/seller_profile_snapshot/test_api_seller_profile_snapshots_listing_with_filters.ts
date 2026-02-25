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

export async function test_api_seller_profile_snapshots_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authorize an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
  } satisfies IShoppingMallAdministrator.IJoin;
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authorizedAdmin);
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 2. Prepare filter inputs
  // We generate a valid sellerId filter
  const sellerIdFilter = typia.random<string & tags.Format<"uuid">>();
  // We generate date range filters for createdAtGte and createdAtLte
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const createdAtGte = past.toISOString();
  const createdAtLte = now.toISOString();
  // Generate a partial shopName match string
  const fullShopName = RandomGenerator.name(3);
  // Extract a substring to simulate partial search
  const shopNamePartial = fullShopName.substring(
    1,
    Math.min(fullShopName.length, 5),
  );
  // 3. Request body with filters and pagination parameters
  const requestBody = {
    sellerId: sellerIdFilter,
    createdAtGte: createdAtGte,
    createdAtLte: createdAtLte,
    shopName: shopNamePartial,
    offset: 0,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  // 4. Perform the request
  const response =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);
  // 5. Assertions: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is equal to requested page",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit does not exceed request limit",
    response.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Validate records conform to requested filters if any data returned
  for (const record of response.data) {
    // SellerId exact match
    TestValidator.equals(
      "seller id matches filter",
      record.seller.id,
      sellerIdFilter,
    );
    // createdAt in range
    const createdAtDate = new Date(record.createdAt);
    TestValidator.predicate(
      `record createdAt ${record.createdAt} >= createdAtGte filter ${createdAtGte}`,
      createdAtDate >= new Date(createdAtGte),
    );
    TestValidator.predicate(
      `record createdAt ${record.createdAt} <= createdAtLte filter ${createdAtLte}`,
      createdAtDate <= new Date(createdAtLte),
    );
    // shopName partial match
    TestValidator.predicate(
      `record shopName includes the filter substring`,
      record.shopName.includes(shopNamePartial),
    );
  }
  // 7. Access control enforcement
  // Try the request with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized access to seller profile snapshots",
    async () => {
      await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
        unauthenticatedConnection,
        { body: {} },
      );
    },
  );
}
