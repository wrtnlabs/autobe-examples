import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSuspension";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspensions_list_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // This test verifies that an administrator can retrieve seller suspensions.
  // It uses an empty filter request since the IRequest DTO is empty and tests
  // that the response is well-formed and contains valid pagination and data entries.
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorizedAdmin);
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 2. Call the seller suspensions index API with empty filters (per IRequest type)
  const response =
    await api.functional.shoppingMall.administrator.seller_suspensions.index(
      adminConnection,
      { body: {} },
    );
  // 3. Validate response
  typia.assert(response);
  // 4. Pagination checks
  TestValidator.predicate(
    "pagination current page > 0",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 5. Validate each suspension record for type correctness
  for (const suspension of response.data) {
    typia.assert(suspension);
    // No additional property validations can be done, as IShoppingMallSellerSuspension.ISummary details are not provided in depth.
  }
}
