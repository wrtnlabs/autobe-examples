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

export async function test_api_seller_sessions_pagination_beyond_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator and get their authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a seller to create exactly one session record
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. As superAdmin, request page 999 (well beyond available range) with limit 20
  const result =
    await api.functional.shoppingMall.superAdmin.sellers.sessions.index(
      superAdminConnection,
      {
        sellerId,
        body: {
          page: 999,
          limit: 20,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate: data must be empty (beyond available range)
  TestValidator.equals("data is empty array", result.data.length, 0);
  // 5. Validate: pagination.records >= 1 (at least 1 session from join step)
  TestValidator.predicate("records >= 1", result.pagination.records >= 1);
  // 6. Validate: pagination.pages >= 1
  TestValidator.predicate("pages >= 1", result.pagination.pages >= 1);
  // 7. Validate: pagination.current === 999 (the requested page)
  TestValidator.equals("current page is 999", result.pagination.current, 999);
  // 8. Validate: pagination.limit === 20
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
}
