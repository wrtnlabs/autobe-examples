import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
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
 * Test that an administrator can browse all authentication sessions for any seller.
 *
 * Verifies the admin session listing endpoint returns a paginated list of seller authentication sessions with complete metadata. A seller account is created via join, which automatically generates an initial session record upon registration. The administrator authenticates and requests the session list without any filters.
 *
 * Validates that pagination metadata is complete and consistent, sessions are sorted by created_at in descending order, and that the seller's initial registration session appears in the results. Both active and expired sessions are included by default when no expiration filter is applied.
 *
 * 1. Administrator creates account and authenticates via join.
 * 2. Seller creates account via join, generating an initial session record.
 * 3. Administrator requests all sessions for the seller without any filters.
 * 4. Validates response structure, pagination consistency, and session ordering.
 */
export async function test_api_admin_seller_sessions_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup — join automatically creates an initial session record
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin browses seller sessions without any filters
  const sessions =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 4. Validate pagination consistency
  TestValidator.predicate(
    "has at least one session from registration",
    sessions.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination records count covers data length",
    sessions.pagination.records >= sessions.data.length,
  );
  // 5. Validate sessions sorted by created_at descending (most recent first)
  for (let i = 1; i < sessions.data.length; i++) {
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      sessions.data[i - 1].created_at >= sessions.data[i].created_at,
    );
  }
}
