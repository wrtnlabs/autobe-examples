import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_seller_sessions_admin_audit_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. Register a new seller account (this creates an initial session record)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. Primary success path: retrieve seller sessions with default pagination
  const defaultPage =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Verify default pagination values
  TestValidator.equals(
    "default current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultPage.pagination.limit, 20);
  // Verify at least one session record exists (from the seller join operation)
  TestValidator.predicate(
    "at least one session exists",
    defaultPage.data.length >= 1,
  );
  // Verify pagination record count is consistent
  TestValidator.predicate(
    "records count matches data length",
    defaultPage.pagination.records >= defaultPage.data.length,
  );
  // 4. Pagination test: limit to 1 record per page
  const limitedPage =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(limitedPage);
  // Verify pagination controls
  TestValidator.equals(
    "limited current page",
    limitedPage.pagination.current,
    1,
  );
  TestValidator.equals("limited limit", limitedPage.pagination.limit, 1);
  TestValidator.equals("limited data length", limitedPage.data.length, 1);
  TestValidator.predicate(
    "pages computed correctly",
    limitedPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pages equals ceil(records/limit)",
    limitedPage.pagination.pages ===
      Math.ceil(limitedPage.pagination.records / 1),
  );
}
