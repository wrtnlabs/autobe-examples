import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_seller_list_by_super_admin_filtered_by_status_and_name(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Create super admin ───────────────────────────────────────────────
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // ─── 2. Register 3 sellers with distinct shop name prefixes ──────────────
  const suffix = RandomGenerator.alphaNumeric(8);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: `AlphaStore_${suffix}`,
    },
  });
  typia.assert(sellerAAuth);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: `BetaShop_${suffix}`,
    },
  });
  typia.assert(sellerBAuth);
  const sellerCConnection: api.IConnection = { host: connection.host };
  const sellerCAuth = await authorize_seller_join(sellerCConnection, {
    body: {
      shop_name: `GammaMarket_${suffix}`,
    },
  });
  typia.assert(sellerCAuth);
  const sellerAId = sellerAAuth.id;
  const sellerBId = sellerBAuth.id;
  const sellerCId = sellerCAuth.id;
  // ─── 3. Ban Seller B ─────────────────────────────────────────────────────
  const bannedSeller = await api.functional.shoppingMall.superAdmin.sellers.ban(
    superAdminConnection,
    { sellerId: sellerBId },
  );
  typia.assert(bannedSeller);
  // ─── 4. Suspend Seller C ─────────────────────────────────────────────────
  const suspendedSeller =
    await api.functional.shoppingMall.superAdmin.sellers.suspend(
      superAdminConnection,
      { sellerId: sellerCId },
    );
  typia.assert(suspendedSeller);
  // ─── Test 1: Filter by isBanned = true ───────────────────────────────────
  const bannedResult =
    await api.functional.shoppingMall.superAdmin.sellers.index(
      superAdminConnection,
      { body: { isBanned: true } satisfies IShoppingMallSeller.IRequest },
    );
  typia.assert(bannedResult);
  // All returned sellers must be banned
  TestValidator.predicate(
    "all returned sellers are banned",
    bannedResult.data.every((s) => s.isBanned === true),
  );
  // Seller B must appear
  TestValidator.predicate(
    "seller B appears in banned results",
    bannedResult.data.some((s) => s.id === sellerBId),
  );
  // Seller A must NOT appear
  TestValidator.predicate(
    "seller A does not appear in banned results",
    bannedResult.data.every((s) => s.id !== sellerAId),
  );
  // Seller C must NOT appear
  TestValidator.predicate(
    "seller C does not appear in banned results",
    bannedResult.data.every((s) => s.id !== sellerCId),
  );
  // ─── Test 2: Filter by isSuspended = true ────────────────────────────────
  const suspendedResult =
    await api.functional.shoppingMall.superAdmin.sellers.index(
      superAdminConnection,
      { body: { isSuspended: true } satisfies IShoppingMallSeller.IRequest },
    );
  typia.assert(suspendedResult);
  // All returned sellers must be suspended
  TestValidator.predicate(
    "all returned sellers are suspended",
    suspendedResult.data.every((s) => s.isSuspended === true),
  );
  // Seller C must appear
  TestValidator.predicate(
    "seller C appears in suspended results",
    suspendedResult.data.some((s) => s.id === sellerCId),
  );
  // Seller A must NOT appear
  TestValidator.predicate(
    "seller A does not appear in suspended results",
    suspendedResult.data.every((s) => s.id !== sellerAId),
  );
  // Seller B must NOT appear
  TestValidator.predicate(
    "seller B does not appear in suspended results",
    suspendedResult.data.every((s) => s.id !== sellerBId),
  );
  // ─── Test 3: Filter by isBanned = false ──────────────────────────────────
  const notBannedResult =
    await api.functional.shoppingMall.superAdmin.sellers.index(
      superAdminConnection,
      { body: { isBanned: false } satisfies IShoppingMallSeller.IRequest },
    );
  typia.assert(notBannedResult);
  // All returned sellers must NOT be banned
  TestValidator.predicate(
    "all returned sellers are not banned",
    notBannedResult.data.every((s) => s.isBanned === false),
  );
  // Seller A must appear
  TestValidator.predicate(
    "seller A appears in non-banned results",
    notBannedResult.data.some((s) => s.id === sellerAId),
  );
  // Seller C must appear (suspended but not banned)
  TestValidator.predicate(
    "seller C appears in non-banned results",
    notBannedResult.data.some((s) => s.id === sellerCId),
  );
  // Seller B must NOT appear
  TestValidator.predicate(
    "seller B does not appear in non-banned results",
    notBannedResult.data.every((s) => s.id !== sellerBId),
  );
  // ─── Test 4: Filter by partial shopName = "Alpha" ────────────────────────
  const alphaResult =
    await api.functional.shoppingMall.superAdmin.sellers.index(
      superAdminConnection,
      { body: { shopName: "Alpha" } satisfies IShoppingMallSeller.IRequest },
    );
  typia.assert(alphaResult);
  // Seller A must appear
  TestValidator.predicate(
    "seller A appears in Alpha shopName filter",
    alphaResult.data.some((s) => s.id === sellerAId),
  );
  // Seller B must NOT appear
  TestValidator.predicate(
    "seller B does not appear in Alpha shopName filter",
    alphaResult.data.every((s) => s.id !== sellerBId),
  );
  // Seller C must NOT appear
  TestValidator.predicate(
    "seller C does not appear in Alpha shopName filter",
    alphaResult.data.every((s) => s.id !== sellerCId),
  );
  // ─── Test 5: Combined filter isSuspended = false AND shopName = "Beta" ───
  const betaNotSuspendedResult =
    await api.functional.shoppingMall.superAdmin.sellers.index(
      superAdminConnection,
      {
        body: {
          isSuspended: false,
          shopName: "Beta",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(betaNotSuspendedResult);
  // Seller B must appear (not suspended, name contains Beta)
  TestValidator.predicate(
    "seller B appears in combined isSuspended=false + shopName=Beta filter",
    betaNotSuspendedResult.data.some((s) => s.id === sellerBId),
  );
  // Seller A must NOT appear
  TestValidator.predicate(
    "seller A does not appear in combined filter",
    betaNotSuspendedResult.data.every((s) => s.id !== sellerAId),
  );
  // Seller C must NOT appear (suspended)
  TestValidator.predicate(
    "seller C does not appear in combined filter",
    betaNotSuspendedResult.data.every((s) => s.id !== sellerCId),
  );
  // ─── Test 6: No sellers match the filter ─────────────────────────────────
  const noMatchResult =
    await api.functional.shoppingMall.superAdmin.sellers.index(
      superAdminConnection,
      {
        body: {
          shopName: "NonExistentShopXYZ_99999",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match - data is empty",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match - records is 0",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match - pages is 0",
    noMatchResult.pagination.pages,
    0,
  );
}
