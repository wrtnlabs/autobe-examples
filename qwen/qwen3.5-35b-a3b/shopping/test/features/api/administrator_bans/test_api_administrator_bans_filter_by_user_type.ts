import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_administrator_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_administrator_bans_filter_by_user_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create customer ban record
  const customerBanConnection: api.IConnection = { host: connection.host };
  const customerBan =
    await generate_random_ecommerce_mall_administrator_user_bans_create(
      customerBanConnection,
      {
        body: {
          user_type: "customer",
          customer_id: admin.id,
          reason: "Test customer ban for filtering",
        } satisfies IEcommerceMallUserBan.ICreate,
      },
    );
  typia.assert(customerBan);
  // 3. Create seller ban record
  const sellerBanConnection: api.IConnection = { host: connection.host };
  const sellerBan =
    await generate_random_ecommerce_mall_administrator_user_bans_create(
      sellerBanConnection,
      {
        body: {
          user_type: "seller",
          seller_id: admin.id,
          reason: "Test seller ban for filtering",
        } satisfies IEcommerceMallUserBan.ICreate,
      },
    );
  typia.assert(sellerBan);
  // 4. Validate created ban records have correct user_type
  TestValidator.equals(
    "customer ban has correct user_type",
    customerBan.user_type,
    "customer",
  );
  TestValidator.equals(
    "seller ban has correct user_type",
    sellerBan.user_type,
    "seller",
  );
  // 5. Test user_type='customer' filter
  const customerFilterConnection: api.IConnection = { host: connection.host };
  const customerBans =
    await api.functional.ecommerceMall.administrator.bans.index(
      customerFilterConnection,
      {
        body: {
          user_type: "customer",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(customerBans);
  // 6. Test user_type='seller' filter
  const sellerFilterConnection: api.IConnection = { host: connection.host };
  const sellerBans =
    await api.functional.ecommerceMall.administrator.bans.index(
      sellerFilterConnection,
      {
        body: {
          user_type: "seller",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sellerBans);
  // 7. Test user_type='all' filter
  const allBansConnection: api.IConnection = { host: connection.host };
  const allBans = await api.functional.ecommerceMall.administrator.bans.index(
    allBansConnection,
    {
      body: {
        user_type: "all",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallUserBan.IRequest,
    },
  );
  typia.assert(allBans);
  // 8. Validate customer ban filter returns only customer bans
  TestValidator.equals(
    "customer filter returns correct count",
    customerBans.data.length,
    1,
  );
  // 9. Validate seller ban filter returns only seller bans
  TestValidator.equals(
    "seller filter returns correct count",
    sellerBans.data.length,
    1,
  );
  // 10. Validate all filter returns both bans combined
  TestValidator.equals(
    "all filter returns combined count",
    allBans.data.length,
    2,
  );
  // 11. Validate customer ban record found and user_type field
  const customerBanRecord = customerBans.data.find(
    (ban) => ban.id === customerBan.id,
  );
  TestValidator.notEquals(
    "customer ban record found in customer filter",
    customerBanRecord,
    undefined,
  );
  const safeCustomerBanRecord = typia.assert<IEcommerceMallUserBan>(
    customerBanRecord!,
  );
  TestValidator.equals(
    "customer ban user_type is 'customer'",
    safeCustomerBanRecord.user_type,
    "customer",
  );
  // 12. Validate seller ban record found and user_type field
  const sellerBanRecord = sellerBans.data.find(
    (ban) => ban.id === sellerBan.id,
  );
  TestValidator.notEquals(
    "seller ban record found in seller filter",
    sellerBanRecord,
    undefined,
  );
  const safeSellerBanRecord = typia.assert<IEcommerceMallUserBan>(
    sellerBanRecord!,
  );
  TestValidator.equals(
    "seller ban user_type is 'seller'",
    safeSellerBanRecord.user_type,
    "seller",
  );
  // 13. Validate both ban types present in 'all' filter
  const allCustomerBan = allBans.data.find((ban) => ban.id === customerBan.id);
  const allSellerBan = allBans.data.find((ban) => ban.id === sellerBan.id);
  typia.assert(allCustomerBan);
  typia.assert(allSellerBan);
  // 14. Validate administrator reference is properly resolved
  TestValidator.equals(
    "customer ban administrator ID",
    customerBan.administrator.id,
    admin.id,
  );
  TestValidator.equals(
    "seller ban administrator ID",
    sellerBan.administrator.id,
    admin.id,
  );
  // 15. Validate pagination metadata
  TestValidator.equals(
    "customer filter pagination current page",
    customerBans.pagination.current,
    1,
  );
  TestValidator.equals(
    "seller filter pagination current page",
    sellerBans.pagination.current,
    1,
  );
  TestValidator.equals(
    "all filter pagination current page",
    allBans.pagination.current,
    1,
  );
  // 16. Validate total records count in pagination
  TestValidator.equals(
    "customer filter total records",
    customerBans.pagination.records,
    1,
  );
  TestValidator.equals(
    "seller filter total records",
    sellerBans.pagination.records,
    1,
  );
  TestValidator.equals(
    "all filter total records",
    allBans.pagination.records,
    2,
  );
}