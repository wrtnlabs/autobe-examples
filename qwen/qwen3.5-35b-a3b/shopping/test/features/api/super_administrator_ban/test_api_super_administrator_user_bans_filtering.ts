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

export async function test_api_super_administrator_user_bans_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create two super administrators for testing
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Result = await authorize_super_administrator_join(
    admin1Connection,
    {
      body: {
        email: `${RandomGenerator.name(1)}.admin1@test.com`,
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(admin1Result);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Result = await authorize_super_administrator_join(
    admin2Connection,
    {
      body: {
        email: `${RandomGenerator.name(1)}.admin2@test.com`,
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(admin2Result);
  const admin1Id = admin1Result.superAdministrator.id;
  const admin2Id = admin2Result.superAdministrator.id;
  // Create date filters
  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000 * 7).toISOString(); // 7 days ago
  // Test 1: User Type Filtering - customer
  let result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "customer",
          ban_status: "all",
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "user_type customer filter returns only customers",
    result.data.every((ban) => ban.user_type === "customer"),
    true,
  );
  // Test 1: User Type Filtering - seller
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "seller",
          ban_status: "all",
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "user_type seller filter returns only sellers",
    result.data.every((ban) => ban.user_type === "seller"),
    true,
  );
  // Test 1: User Type Filtering - all
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "all",
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "user_type all filter returns all types",
    result.data.every(
      (ban) => ban.user_type === "customer" || ban.user_type === "seller",
    ),
    true,
  );
  // Test 2: Ban Status Filtering - active
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "active",
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "ban_status active filter returns only active bans",
    result.data.every((ban) => ban.ban_status === "active"),
    true,
  );
  // Test 2: Ban Status Filtering - completed
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "completed",
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "ban_status completed filter returns only completed bans",
    result.data.every((ban) => ban.ban_status === "completed"),
    true,
  );
  // Test 3: Administrator Filtering - first admin
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "all",
          administrator_id: admin1Id,
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "administrator_id filter first admin returns only first admin bans",
    result.data.every((ban) => ban.administrator.id === admin1Id),
    true,
  );
  // Test 3: Administrator Filtering - second admin
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin2Connection,
      {
        body: {
          user_type: "all",
          ban_status: "all",
          administrator_id: admin2Id,
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "administrator_id filter second admin returns only second admin bans",
    result.data.every((ban) => ban.administrator.id === admin2Id),
    true,
  );
  // Test 4: Date Range Filtering - created_at_after
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "all",
          created_at_after: pastDate,
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  result.data.forEach((ban) => {
    TestValidator.predicate(
      `ban created_at after filter ${ban.id}`,
      new Date(ban.created_at) >= new Date(pastDate),
    );
  });
  // Test 4: Date Range Filtering - banned_at_before
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "all",
          banned_at_before: pastDate,
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  result.data.forEach((ban) => {
    TestValidator.predicate(
      `ban banned_at before filter ${ban.id}`,
      new Date(ban.banned_at) <= new Date(pastDate),
    );
  });
  // Test 5: Text Search on Reason - violation
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "all",
          reason_contains: "violation",
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  result.data.forEach((ban) => {
    TestValidator.predicate(
      `reason_contains filter case insensitive ${ban.id}`,
      ban.reason.toLowerCase().includes("violation"),
    );
  });
  // Test 6: Combined Filters - user_type + ban_status + date range
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "customer",
          ban_status: "active",
          created_at_after: pastDate,
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  result.data.forEach((ban) => {
    TestValidator.equals(
      `combined filter customer active ${ban.id}`,
      ban.user_type,
      "customer",
    );
    TestValidator.equals(
      `combined filter active status ${ban.id}`,
      ban.ban_status,
      "active",
    );
    TestValidator.predicate(
      `combined filter date range ${ban.id}`,
      new Date(ban.created_at) >= new Date(pastDate),
    );
  });
  // Test 7: Empty Results with non-existent reason
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "all",
          reason_contains: "nonexistentkeywordxyz",
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "nonexistent reason filter returns empty data array",
    result.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata correct for empty results",
    result.pagination.records === 0 && result.pagination.pages === 0,
  );
  // Test 8: Verify pagination fields
  result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      admin1Connection,
      {
        body: {
          user_type: "all",
          ban_status: "all",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.equals(
    "pagination pages calculation",
    result.pagination.pages,
    result.pagination.records > 0
      ? Math.ceil(result.pagination.records / 10)
      : 0,
  );
}
