import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_sessions_filter_active_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin and create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new seller (creates an active session) and capture seller id
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. As super admin, filter seller sessions with isExpired: false (active sessions)
  const activeSessionsPage =
    await api.functional.shoppingMall.superAdmin.sellers.sessions.index(
      superAdminConnection,
      {
        sellerId,
        body: {
          isExpired: false,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(activeSessionsPage);
  // 4. Validate that at least one active session exists (the join session)
  TestValidator.predicate(
    "active sessions pagination.records >= 1",
    activeSessionsPage.pagination.records >= 1,
  );
  // 5. Validate all returned sessions have expired_at in the future
  const now = new Date().toISOString();
  for (const session of activeSessionsPage.data) {
    TestValidator.predicate(
      "session expired_at is in the future",
      session.expired_at > now,
    );
  }
  // 6. Call with isExpired: true — should return 0 records since sessions are fresh
  const expiredSessionsPage =
    await api.functional.shoppingMall.superAdmin.sellers.sessions.index(
      superAdminConnection,
      {
        sellerId,
        body: { isExpired: true } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(expiredSessionsPage);
  TestValidator.equals(
    "expired sessions pagination.records should be 0",
    expiredSessionsPage.pagination.records,
    0,
  );
}
