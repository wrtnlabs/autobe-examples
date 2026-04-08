import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_customer_ban_list_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_super_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(adminResult);
  // 2. Login with super administrator credentials
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(adminResult);
  // 3. Query with ban_status='active' filter - verify pagination metadata
  const activeBans =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      superAdminConnection,
      {
        body: {
          ban_status: "active",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(activeBans);
  TestValidator.equals(
    "active bans page current",
    activeBans.pagination.current,
    1,
  );
  TestValidator.equals("active bans limit", activeBans.pagination.limit, 10);
  TestValidator.equals(
    "active bans total records",
    activeBans.pagination.records,
    0,
  );
  TestValidator.equals(
    "active bans total pages",
    activeBans.pagination.pages,
    0,
  );
  TestValidator.equals("active bans data is empty", activeBans.data.length, 0);
  // 4. Query with ban_status='all' filter - verify all bans returned (may include lifted)
  const allBans =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      superAdminConnection,
      {
        body: {
          ban_status: "all",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allBans);
  TestValidator.equals("all bans page current", allBans.pagination.current, 1);
  TestValidator.equals("all bans limit", allBans.pagination.limit, 10);
  TestValidator.equals("all bans total records", allBans.pagination.records, 0);
  TestValidator.equals("all bans total pages", allBans.pagination.pages, 0);
  // 5. Test pagination - page=2 with limit=5
  const page2Bans =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page2Bans);
  TestValidator.equals("page 2 current", page2Bans.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Bans.pagination.limit, 5);
  TestValidator.equals("page 2 total records", page2Bans.pagination.records, 0);
  TestValidator.equals("page 2 total pages", page2Bans.pagination.pages, 0);
  // 6. Test customer_email partial filter - verify it accepts parameter
  const emailFiltered =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      superAdminConnection,
      {
        body: {
          customer_email: "test",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emailFiltered);
  TestValidator.equals(
    "email filter current",
    emailFiltered.pagination.current,
    1,
  );
  // 7. Test customer_display_name partial filter
  const nameFiltered =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      superAdminConnection,
      {
        body: {
          customer_display_name: "John",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(nameFiltered);
  TestValidator.equals(
    "name filter current",
    nameFiltered.pagination.current,
    1,
  );
  // 8. Test reason partial filter
  const reasonFiltered =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      superAdminConnection,
      {
        body: {
          reason: "fraud",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(reasonFiltered);
  TestValidator.equals(
    "reason filter current",
    reasonFiltered.pagination.current,
    1,
  );
  // 9. Test date range filter
  const dateFiltered =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      superAdminConnection,
      {
        body: {
          banned_at_start: "2024-01-01T00:00:00Z",
          banned_at_end: "2024-12-31T23:59:59Z",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "date range filter current",
    dateFiltered.pagination.current,
    1,
  );
  // 10. Test administrator_id filter
  const adminIdFiltered =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      superAdminConnection,
      {
        body: {
          administrator_id: adminResult.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(adminIdFiltered);
  TestValidator.equals(
    "admin ID filter current",
    adminIdFiltered.pagination.current,
    1,
  );
  // 11. Test response structure - verify pagination metadata fields
  TestValidator.equals(
    "pagination has current field",
    activeBans.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has limit field",
    activeBans.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has records field",
    activeBans.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages field",
    activeBans.pagination.pages >= 0,
    true,
  );
}
