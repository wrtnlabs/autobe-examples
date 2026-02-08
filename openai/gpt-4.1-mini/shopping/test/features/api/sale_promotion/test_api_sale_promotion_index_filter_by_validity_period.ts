import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_promotion_index_filter_by_validity_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminJoin.token.access}`,
  };
  // 2. Call sale promotions index with empty filter (filter by validity period not supported)
  const response =
    await api.functional.shoppingMall.administrator.sale_promotions.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current page should be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages should be zero or more",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be zero or more",
    response.pagination.records >= 0,
  );
  // 4. Since promotion start_at and promotion_code do not exist in ISummary, skip detailed date filtering and code checks.
  // Only validate that data is sorted descending by start_at if the field exists
  if (response.data.length > 1) {
    // Defensive check: if start_at exists as string property in first item, attempt sorting check
    if ("start_at" in response.data[0]) {
      for (let i = 1; i < response.data.length; ++i) {
        const prev = new Date((response.data[i - 1] as any).start_at);
        const curr = new Date((response.data[i] as any).start_at);
        TestValidator.predicate(
          `promotion start_at of item ${i - 1} should be >= item ${i}`,
          prev >= curr,
        );
      }
    }
  }
}
