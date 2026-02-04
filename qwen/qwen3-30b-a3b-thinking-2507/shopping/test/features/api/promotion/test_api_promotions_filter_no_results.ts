import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalesPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalesPromotion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSalesPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_promotions_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // STEP 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      // Admin join requires no parameters for this test
    },
  });
  // STEP 2: Define filter that will have no results with guaranteed non-existent value
  // Use a string that is known to never match a real promotion code
  const nonExistentPromotionCode = "no_match";
  // STEP 3: Get promotions with this non-matching filter
  const output = await api.functional.shoppingMall.admin.promotions.index(
    adminConnection,
    {
      body: {
        promotion_code: nonExistentPromotionCode,
      } satisfies IShoppingMallSalesPromotion.IRequest,
    },
  );
  // STEP 4: Validate the response
  typia.assert(output);
  // Verify empty data array
  TestValidator.equals("empty data list", output.data, []);
  // Verify pagination metadata for empty response
  const expectedPagination = {
    current: 1,
    limit: 20,
    records: 0,
    pages: 0,
  };
  TestValidator.equals(
    "pagination metadata",
    {
      current: output.pagination.current,
      limit: output.pagination.limit,
      records: output.pagination.records,
      pages: output.pagination.pages,
    },
    expectedPagination,
  );
}
