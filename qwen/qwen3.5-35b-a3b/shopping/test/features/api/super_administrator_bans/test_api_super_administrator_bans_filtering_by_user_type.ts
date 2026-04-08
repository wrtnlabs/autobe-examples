import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_bans_filtering_by_user_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Test user_type filter with 'customer'
  const customerBansPage =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(customerBansPage);
  TestValidator.equals(
    "customer filter - all bans are customer type",
    customerBansPage.data.every((ban) => ban.user_type === "customer"),
    true,
  );
  // 3. Test user_type filter with 'seller'
  const sellerBansPage =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      {
        body: {
          user_type: "seller",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(sellerBansPage);
  TestValidator.equals(
    "seller filter - all bans are seller type",
    sellerBansPage.data.every((ban) => ban.user_type === "seller"),
    true,
  );
  // 4. Test user_type filter with 'all'
  const allBansPage =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      {
        body: {
          user_type: "all",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(allBansPage);
  TestValidator.equals(
    "all filter - all bans returned regardless of type",
    allBansPage.data.every(
      (ban) => ban.user_type === "customer" || ban.user_type === "seller",
    ),
    true,
  );
  // 5. Verify ban_status field reflects correct status for each ban
  for (const ban of allBansPage.data) {
    TestValidator.equals(
      `ban ${ban.id} status is valid`,
      ban.ban_status === "active" || ban.ban_status === "completed",
      true,
    );
  }
  // 6. Test pagination with filtering - when filtered results < limit
  const limitedCustomerBans =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          limit: 5,
          page: 1,
        },
      },
    );
  typia.assert(limitedCustomerBans);
  TestValidator.equals(
    "pagination - records equals actual data count when filtered results < limit",
    limitedCustomerBans.pagination.records,
    limitedCustomerBans.data.length,
  );
  TestValidator.equals(
    "pagination - pages equals 1 when filtered results fit in one page",
    limitedCustomerBans.pagination.pages,
    1,
  );
  // 7. Test empty filter result - use reason_contains with non-matching text
  const emptyCustomerBans =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          limit: 100,
          page: 1,
          reason_contains: "NONEXISTENT_REASON_XXX",
        },
      },
    );
  typia.assert(emptyCustomerBans);
  TestValidator.equals(
    "empty filter - data array is empty",
    emptyCustomerBans.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter - records is 0",
    emptyCustomerBans.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter - pages is 0",
    emptyCustomerBans.pagination.pages,
    0,
  );
}
