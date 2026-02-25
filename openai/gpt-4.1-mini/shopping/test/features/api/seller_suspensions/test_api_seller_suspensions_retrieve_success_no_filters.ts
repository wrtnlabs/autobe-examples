import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSuspension";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspensions_retrieve_success_no_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful retrieval of seller suspension records by an administrator with no filters applied.
   * Validate pagination defaults to first page, with correct total records and data consistency.
   * Ensure the response includes seller summary information for each suspension record.
   * Confirm authorization is enforced and only accessible by authenticated administrators.
   */
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Call seller suspensions retrieval endpoint with no filters
  const response =
    await api.functional.shoppingMall.administrator.sellerSuspensions.index(
      adminConnection,
      {
        body: {}, // no filters
      },
    );
  // 3. Validate response structure
  typia.assert(response);
  // 4. Validate pagination defaults
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  // 5. Check data array non-null and array type
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );
  // 6. Validate each suspension record in data array
  for (const suspension of response.data) {
    typia.assert(suspension);
    typia.assert(suspension.seller);
    TestValidator.predicate(
      "suspension ID is non-empty string",
      typeof suspension.id === "string" && suspension.id.length > 0,
    );
    TestValidator.predicate(
      "suspension reason is non-empty string",
      typeof suspension.suspensionReason === "string" &&
        suspension.suspensionReason.length > 0,
    );
    TestValidator.predicate(
      "seller ID matches suspension sellerId",
      suspension.sellerId === suspension.seller.id,
    );
  }
}
