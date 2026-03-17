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

export async function test_api_seller_sessions_admin_filter_by_expiry_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller (creates first session)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoined);
  const sellerId = sellerJoined.id;
  // 3. Perform additional seller login to create another session record
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoggedIn);
  // --- Filter by active sessions (isExpired: false) ---
  const now = new Date();
  const activeSessions =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId,
        body: {
          isExpired: false,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // At least one active session should exist
  TestValidator.predicate(
    "at least one active session exists",
    activeSessions.data.length > 0,
  );
  // All returned sessions should have expired_at in the future
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session expired_at is in the future",
      new Date(session.expired_at) > now,
    );
  }
  // --- Filter by creation date range ---
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const dateRangeSessions =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId,
        body: {
          createdAtFrom: oneHourAgo,
          createdAtTo: oneHourLater,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(dateRangeSessions);
  TestValidator.predicate(
    "date range returns at least one session",
    dateRangeSessions.pagination.records >= 1,
  );
  // --- Sorting control: sortBy expired_at asc ---
  const sortedSessions =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId,
        body: {
          sortBy: "expired_at",
          sortOrder: "asc",
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sortedSessions);
  // Verify ascending order of expired_at
  for (let i = 1; i < sortedSessions.data.length; i++) {
    const prev = new Date(sortedSessions.data[i - 1]!.expired_at).getTime();
    const curr = new Date(sortedSessions.data[i]!.expired_at).getTime();
    TestValidator.predicate(
      "sessions sorted by expired_at ascending",
      prev <= curr,
    );
  }
  // --- IP address filter: use a clearly non-existent IP ---
  const nonExistentIp = "192.0.2.255"; // TEST-NET address, shouldn't match any session
  const ipFilteredSessions =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId,
        body: {
          ip: nonExistentIp,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(ipFilteredSessions);
  TestValidator.predicate(
    "no sessions match non-existent IP - data empty",
    ipFilteredSessions.data.length === 0,
  );
  TestValidator.predicate(
    "no sessions match non-existent IP - records 0",
    ipFilteredSessions.pagination.records === 0,
  );
}
