import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering seller password reset token history by active expiry status.
 *
 * Verifies that an administrator can filter a seller's password reset token
 * records to show only tokens that have not yet expired. After authenticating
 * as an administrator and creating a seller account, the test queries the
 * password reset history endpoint with the expiry filter set to 'active' and
 * validates that every returned record has expired=false.
 *
 * The pagination metadata is also validated to confirm it reflects only the
 * count of active (non-expired) tokens, not the total including expired ones.
 *
 * 1. Administrator registers and is automatically authenticated.
 * 2. Seller account is created.
 * 3. Administrator queries the seller's password reset history with expiry='active'.
 * 4. Validates all returned records have expired=false.
 * 5. Validates pagination metadata reflects only the filtered count.
 */
export async function test_api_seller_password_resets_filter_active_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Query password reset history with active filter
  const result =
    await api.functional.shoppingMall.admin.sellers.password_resets.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          expiry: "active",
        } satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate all records have expired=false
  for (const record of result.data) {
    TestValidator.predicate("token is not expired", record.expired === false);
  }
  // 5. Validate pagination metadata reflects only active token count
  TestValidator.equals(
    "pagination records match data length",
    result.pagination.records,
    result.data.length,
  );
}
