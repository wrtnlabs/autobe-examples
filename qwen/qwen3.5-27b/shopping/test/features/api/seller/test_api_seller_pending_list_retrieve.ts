import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the primary success path for viewing pending seller approval requests.
 *
 * Validates that an authenticated administrator can retrieve a paginated list of seller accounts awaiting approval. The test verifies the response structure includes seller summary information and associated shop profile details, with proper sorting and pagination metadata.
 *
 * 1. Authenticate as administrator with random credentials.
 * 2. Retrieve the pending sellers list with default pagination.
 * 3. Validate response structure, sorting, and pagination accuracy.
 */
export async function test_api_seller_pending_list_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Retrieve pending sellers list
  const request: IShoppingMallSeller.IRequest = {
    approval_status: "pending",
    page: 1,
    limit: 10,
    sort: {
      field: "created_at",
      direction: "desc",
    },
  } satisfies IShoppingMallSeller.IRequest;
  const response =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit matches request", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate seller data structure
  for (const seller of response.data) {
    // Verify business logic: approval status is pending
    TestValidator.equals(
      "approval status is pending",
      seller.approval_status,
      "pending",
    );
    // Verify seller profile information exists
    TestValidator.predicate(
      "seller has shop_name",
      seller.seller_profile.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller has shop_description",
      seller.seller_profile.shop_description.length > 0,
    );
  }
  // 5. Validate sorting (created_at descending)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].created_at).getTime();
      const currDate = new Date(response.data[i].created_at).getTime();
      TestValidator.predicate(
        `seller ${i} is not newer than seller ${i - 1}`,
        currDate <= prevDate,
      );
    }
  }
  // 6. Verify pagination consistency
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
}
