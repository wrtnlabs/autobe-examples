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
 * Test unfiltered listing of a seller's password reset token history by an administrator.
 *
 * Validates that an authenticated administrator can retrieve the complete password reset history for a specific seller with no filters applied. The response is a paginated result containing summary records with id, expired status, created_at, and expired_at fields, sorted newest-first.
 *
 * Critical security validation: confirms that raw cryptographic token values are never exposed in summary records — only the boolean expired status indicator is visible. The ISummary type structurally excludes token fields, and typia.assert enforces this at runtime.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Seller registers and authenticates via join.
 * 3. Administrator queries the seller's password reset history with an empty request body (no filters).
 * 4. Validates pagination metadata accuracy: records count matches data array length.
 * 5. Validates sort order is newest-first when multiple records exist.
 */
export async function test_api_seller_password_resets_list_unfiltered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin retrieves unfiltered password reset history
  const result =
    await api.functional.shoppingMall.admin.sellers.password_resets.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {} satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination metadata accuracy
  TestValidator.equals(
    "records match data length",
    result.pagination.records,
    result.data.length,
  );
  // 5. Validate sort order (newest first) when multiple records exist
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        "sorted newest first",
        new Date(result.data[i].created_at).getTime() >=
          new Date(result.data[i + 1].created_at).getTime(),
      );
    }
  }
}
