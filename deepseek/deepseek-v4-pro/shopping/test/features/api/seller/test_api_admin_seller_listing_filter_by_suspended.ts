import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator seller listing filtered by suspended status.
 *
 * Validates the admin moderation workflow for auditing suspended sellers. An administrator authenticates and requests the seller listing with the suspended filter set to true, then verifies that every seller in the paginated results has the suspended flag set to true and that pagination metadata is correct and present.
 *
 * 1. Administrator joins and authenticates via authorize_admin_join.
 * 2. Administrator requests seller listing filtered by suspended=true.
 * 3. Validates response structure with typia.assert.
 * 4. Confirms pagination metadata has non-negative values.
 * 5. Verifies every returned seller has suspended === true.
 */
export async function test_api_admin_seller_listing_filter_by_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Request seller listing filtered by suspended=true
  const result = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        suspended: true,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Verify every seller has suspended === true
  for (const seller of result.data) {
    TestValidator.equals(
      `seller ${seller.id} is suspended`,
      seller.suspended,
      true,
    );
  }
}
