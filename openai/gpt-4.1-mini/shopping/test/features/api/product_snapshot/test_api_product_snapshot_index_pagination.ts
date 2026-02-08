import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_index_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Use the utility function to join as an administrator (no payload required as IJoin is empty)
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Assign authorization token to headers
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Call the productSnapshots index endpoint with an empty body for default pagination
  const response =
    await api.functional.shoppingMall.administrator.productSnapshots.index(
      adminConnection,
      {
        body: {}, // No filters or pagination parameters to request defaults
      },
    );
  // 3. Validate the response structure
  typia.assert(response);
  // 4. Check pagination properties in the response
  TestValidator.predicate(
    "pagination current page must be >=1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit must be >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be >= 0",
    response.pagination.pages >= 0,
  );
  // 5. The page count must be zero if records are zero, else pages must be >= 1
  if (response.pagination.records === 0) {
    TestValidator.equals("pages when no records", response.pagination.pages, 0);
  } else {
    TestValidator.predicate(
      "pages when records exist >= 1",
      response.pagination.pages >= 1,
    );
  }
  // 6. The data array must have length <= limit
  TestValidator.predicate(
    "data length must be <= pagination limit",
    response.data.length <= response.pagination.limit,
  );
  // 7. If data exists, assert each snapshot summary
  if (response.data.length > 0) {
    for (const summary of response.data) {
      typia.assert(summary);
    }
  }
}
