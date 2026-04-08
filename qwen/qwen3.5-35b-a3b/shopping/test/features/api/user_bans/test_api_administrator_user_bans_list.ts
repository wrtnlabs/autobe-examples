import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
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

export async function test_api_administrator_user_bans_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Test default parameters - view all ban records
  const defaultBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "all" as const,
          page: 1,
          limit: 20,
          sort: "created_at:desc" as const,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(defaultBans);
  TestValidator.equals(
    "default pagination current",
    defaultBans.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultBans.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination records non-negative",
    defaultBans.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "default pagination pages non-negative",
    defaultBans.pagination.pages >= 0,
    true,
  );
  // 3. Filter by user_type - customer
  const customerBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "customer" as const,
          ban_status: "all" as const,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(customerBans);
  if (customerBans.data.length > 0) {
    customerBans.data.forEach((ban, idx) => {
      TestValidator.equals(
        `customer filter ban ${idx} user_type`,
        ban.user_type,
        "customer",
      );
    });
  }
  // 4. Filter by user_type - seller
  const sellerBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "seller" as const,
          ban_status: "all" as const,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sellerBans);
  if (sellerBans.data.length > 0) {
    sellerBans.data.forEach((ban, idx) => {
      TestValidator.equals(
        `seller filter ban ${idx} user_type`,
        ban.user_type,
        "seller",
      );
    });
  }
  // 5. Filter by ban_status - active
  const activeBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "active" as const,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(activeBans);
  if (activeBans.data.length > 0) {
    activeBans.data.forEach((ban, idx) => {
      TestValidator.equals(
        `active ban ${idx} ban_status`,
        ban.ban_status,
        "active",
      );
    });
  }
  // 6. Filter by ban_status - completed
  const completedBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "completed" as const,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(completedBans);
  if (completedBans.data.length > 0) {
    completedBans.data.forEach((ban, idx) => {
      TestValidator.equals(
        `completed ban ${idx} ban_status`,
        ban.ban_status,
        "completed",
      );
    });
  }
  // 7. Test pagination with maximum limit
  const maxLimitBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "all" as const,
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(maxLimitBans);
  TestValidator.equals(
    "max limit pagination",
    maxLimitBans.pagination.limit,
    100,
  );
  // 8. Test custom sorting - administrator_id asc
  const sortedByAdminAsc =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "all" as const,
          sort: "administrator_id:asc" as const,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sortedByAdminAsc);
  // 9. Test custom sorting - administrator_id desc
  const sortedByAdminDesc =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "all" as const,
          sort: "administrator_id:desc" as const,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sortedByAdminDesc);
  // 10. Verify administrator reference structure
  if (defaultBans.data.length > 0) {
    const firstBan = defaultBans.data[0];
    typia.assert(firstBan.administrator);
    TestValidator.equals(
      "administrator id exists",
      firstBan.administrator.id !== undefined,
      true,
    );
    TestValidator.equals(
      "administrator displayName exists",
      firstBan.administrator.displayName !== undefined,
      true,
    );
    TestValidator.equals(
      "administrator email exists",
      firstBan.administrator.email !== undefined,
      true,
    );
  }
  // 11. Test combined filters - customer active bans
  const combinedFilters =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "customer" as const,
          ban_status: "active" as const,
          page: 1,
          limit: 50,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(combinedFilters);
  if (combinedFilters.data.length > 0) {
    combinedFilters.data.forEach((ban, idx) => {
      TestValidator.equals(
        `combined filter ${idx} user_type`,
        ban.user_type,
        "customer",
      );
      TestValidator.equals(
        `combined filter ${idx} ban_status`,
        ban.ban_status,
        "active",
      );
    });
  }
  // 12. Test date range filtering - banned_at_after
  const dateRangeBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "all" as const,
          banned_at_after: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(dateRangeBans);
  // 13. Test date range filtering - created_at_before
  const dateRangeBans2 =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "all" as const,
          created_at_before: new Date().toISOString(),
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(dateRangeBans2);
  // 14. Test administrator_id filter
  if (defaultBans.data.length > 0) {
    const testAdminId = defaultBans.data[0].administrator.id;
    const filteredByAdmin =
      await api.functional.ecommerceMall.administrator.user_bans.index(
        adminAuthConnection,
        {
          body: {
            user_type: "all" as const,
            ban_status: "all" as const,
            administrator_id: testAdminId,
          } satisfies IEcommerceMallUserBan.IRequest,
        },
      );
    typia.assert(filteredByAdmin);
    if (filteredByAdmin.data.length > 0) {
      filteredByAdmin.data.forEach((ban, idx) => {
        TestValidator.equals(
          `filtered by admin ${idx} administrator id`,
          ban.administrator.id,
          testAdminId,
        );
      });
    }
  }
  // 15. Test reason_contains filter
  const reasonContainsBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "all" as const,
          reason_contains: "violation",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(reasonContainsBans);
  // 16. Test pagination page parameter
  const paginationPageBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminAuthConnection,
      {
        body: {
          user_type: "all" as const,
          ban_status: "all" as const,
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(paginationPageBans);
  TestValidator.equals(
    "pagination page 2",
    paginationPageBans.pagination.current,
    2,
  );
}
