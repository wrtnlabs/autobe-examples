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

export async function test_api_seller_sessions_admin_sensitive_token_exclusion_and_seller_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a seller to get a valid sellerId with an existing session
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. Admin queries the seller's sessions
  const sessionPage =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  // 4. Verify at least one session exists (seller join creates a session)
  TestValidator.predicate(
    "at least one session exists after seller registration",
    sessionPage.data.length >= 1,
  );
  // 5. Verify sensitive tokens are NOT present in the session objects
  // The ISummary type only has: id, ip, href, referrer, created_at, expired_at
  // access_token and refresh_token must not be present
  for (const session of sessionPage.data) {
    const sessionKeys = Object.keys(session);
    TestValidator.predicate(
      "access_token must not be in session summary",
      !sessionKeys.includes("access_token"),
    );
    TestValidator.predicate(
      "refresh_token must not be in session summary",
      !sessionKeys.includes("refresh_token"),
    );
    TestValidator.predicate(
      "id must be present in session summary",
      sessionKeys.includes("id"),
    );
    TestValidator.predicate(
      "ip must be present in session summary",
      sessionKeys.includes("ip"),
    );
    TestValidator.predicate(
      "href must be present in session summary",
      sessionKeys.includes("href"),
    );
    TestValidator.predicate(
      "created_at must be present in session summary",
      sessionKeys.includes("created_at"),
    );
    TestValidator.predicate(
      "expired_at must be present in session summary",
      sessionKeys.includes("expired_at"),
    );
  }
  // 6. Verify pagination structure correctness
  const pagination = sessionPage.pagination;
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // Verify pages === Math.ceil(records / limit), handle edge cases
  if (pagination.limit > 0 && pagination.records > 0) {
    TestValidator.equals(
      "pages equals Math.ceil(records / limit)",
      pagination.pages,
      Math.ceil(pagination.records / pagination.limit),
    );
  } else if (pagination.records === 0) {
    TestValidator.predicate(
      "pages is 0 when records is 0",
      pagination.pages === 0,
    );
  }
  // 7. Not found scenario: query sessions for a non-existent seller UUID
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent seller returns 404", async () => {
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId: nonExistentSellerId,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  });
}
