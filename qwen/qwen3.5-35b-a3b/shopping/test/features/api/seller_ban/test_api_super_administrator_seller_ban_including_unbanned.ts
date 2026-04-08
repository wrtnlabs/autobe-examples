import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_seller_ban_including_unbanned(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the include_unbanned parameter functionality for seller ban subtype records.
   *
   * Validates that the include_unbanned parameter correctly controls whether soft-deleted (unbanned) seller ban records are included in list results.
   * By default, unbanned sellers (deleted_at IS NOT NULL) are excluded from list results. When include_unbanned is set to true, soft-deleted ban records should be included.
   *
   * 1. Super administrator registers to obtain authentication tokens.
   * 2. Fetch seller ban list without include_unbanned (default behavior).
   * 3. Verify response excludes all unbanned seller records (deleted_at IS NOT NULL).
   * 4. Fetch seller ban list with include_unbanned=true.
   * 5. Verify response includes both active bans and unbanned seller records.
   * 6. Verify unbanned records have deleted_at field populated with timestamp.
   * 7. Verify unbanned records have ban_status='completed'.
   * 8. Verify active bans have deleted_at IS NULL and ban_status='active'.
   */
  // Step 1: Super administrator registers to obtain authentication tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth =
    await api.functional.ecommerceMall.auth.super_administrator.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          display_name: RandomGenerator.name(2),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>() ?? null,
          ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
        } satisfies IEcommerceMallSuperAdministrator.IJoin,
      },
    );
  typia.assert(adminAuth);
  // Step 2: Fetch seller ban list without include_unbanned (default behavior)
  const bansWithoutUnbanned: IPageIEcommerceMallUserBanOfSeller =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(bansWithoutUnbanned);
  // Step 3: Verify response excludes all unbanned seller records (deleted_at IS NOT NULL)
  const hasUnbannedWithoutFlag = bansWithoutUnbanned.data.some(
    (ban) => ban.deleted_at !== null,
  );
  TestValidator.predicate(
    "no unbanned records without include_unbanned flag",
    !hasUnbannedWithoutFlag,
  );
  // Step 4: Fetch seller ban list with include_unbanned=true
  const bansWithUnbanned: IPageIEcommerceMallUserBanOfSeller =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          include_unbanned: true,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(bansWithUnbanned);
  // Step 5: Verify response includes both active bans and unbanned seller records
  const activeBans = bansWithUnbanned.data.filter(
    (ban) => ban.deleted_at === null,
  );
  const unbannedBans = bansWithUnbanned.data.filter(
    (ban) => ban.deleted_at !== null,
  );
  TestValidator.equals(
    "pagination records count matches total",
    bansWithUnbanned.pagination.records,
    bansWithUnbanned.data.length,
  );
  // Step 6: Verify unbanned records have deleted_at field populated
  unbannedBans.forEach((ban) => {
    TestValidator.predicate(
      `unbanned ban ${ban.id} has deleted_at populated`,
      ban.deleted_at !== null,
    );
  });
  // Step 7: Verify unbanned records have ban_status='completed'
  unbannedBans.forEach((ban) => {
    TestValidator.equals(
      `unbanned ban ${ban.id} has ban_status='completed'`,
      ban.ban.ban_status,
      "completed",
    );
  });
  // Step 8: Verify active bans have deleted_at IS NULL
  activeBans.forEach((ban) => {
    TestValidator.equals(
      `active ban ${ban.id} has deleted_at IS NULL`,
      ban.deleted_at,
      null,
    );
  });
  // Step 9: Verify active bans have ban_status='active'
  activeBans.forEach((ban) => {
    TestValidator.equals(
      `active ban ${ban.id} has ban_status='active'`,
      ban.ban.ban_status,
      "active",
    );
  });
}