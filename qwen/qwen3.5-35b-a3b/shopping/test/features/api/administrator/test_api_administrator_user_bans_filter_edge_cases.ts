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

export async function test_api_administrator_user_bans_filter_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication Setup - Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Combined Filter Scenarios
  // Test user_type='customer', ban_status='active', limit=10
  const customerActiveBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          user_type: "customer" as const,
          ban_status: "active" as const,
          limit: 10,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(customerActiveBans);
  TestValidator.predicate(
    "customer active ban pagination valid",
    customerActiveBans.pagination.records >= 0 &&
      customerActiveBans.pagination.limit === 10,
  );
  // Test user_type='seller', ban_status='completed', limit=20
  const sellerCompletedBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          user_type: "seller" as const,
          ban_status: "completed" as const,
          limit: 20,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sellerCompletedBans);
  TestValidator.predicate(
    "seller completed ban pagination valid",
    sellerCompletedBans.pagination.records >= 0 &&
      sellerCompletedBans.pagination.limit === 20,
  );
  // Test all three filters together: user_type, ban_status, and administrator_id
  const combinedBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          user_type: "customer" as const,
          ban_status: "all" as const,
          administrator_id: adminJoin.id,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(combinedBans);
  // 3. Administrator ID Filtering
  // Verify only bans issued by this administrator are returned
  if (combinedBans.data.length > 0) {
    for (const ban of combinedBans.data) {
      TestValidator.equals(
        `administrator_id matches filter (${ban.id})`,
        ban.administrator.id,
        adminJoin.id,
      );
    }
  }
  // Test with user_type='customer' combined with administrator_id
  const customerByAdmin =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          user_type: "customer" as const,
          administrator_id: adminJoin.id,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(customerByAdmin);
  // 4. Reason Text Search - ILIKE case-insensitive search
  // Test with reason_contains='violation'
  const violationBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          reason_contains: "violation",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(violationBans);
  // Verify all results contain 'violation' in reason (case-insensitive)
  for (const ban of violationBans.data) {
    TestValidator.predicate(
      `reason contains 'violation' (${ban.reason})`,
      ban.reason.toLowerCase().includes("violation"),
    );
  }
  // Test with reason_contains='spam'
  const spamBans =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          user_type: "seller" as const,
          reason_contains: "spam",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(spamBans);
  for (const ban of spamBans.data) {
    TestValidator.predicate(
      `reason contains 'spam' (${ban.reason})`,
      ban.reason.toLowerCase().includes("spam"),
    );
  }
  // Test pagination works correctly with text search results
  const paginatedTextSearch =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          reason_contains: "violation",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(paginatedTextSearch);
  TestValidator.predicate(
    "limit respected in text search",
    paginatedTextSearch.data.length <= 5,
  );
  // 5. Pagination Edge Cases
  // Request page=1, limit=20 (default)
  const defaultPagination =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "pagination current page",
    defaultPagination.pagination.current,
    1,
  );
  // Request page=999 with limit=1 to verify non-existent page handling
  const nonExistentPage =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          page: 999,
          limit: 1,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(nonExistentPage);
  TestValidator.equals(
    "empty data on non-existent page",
    nonExistentPage.data.length,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    nonExistentPage.pagination.current,
    1,
  );
  // Test limit=1 (minimum practical value)
  const limit1 =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          limit: 1,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(limit1);
  TestValidator.predicate("limit 1 works", limit1.data.length <= 1);
  // Test limit=100 (maximum allowed value)
  const limit100 =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(limit100);
  TestValidator.predicate("limit 100 works", limit100.data.length <= 100);
  // 6. Sort Validation
  // Test invalid sort field to verify 400 error response
  await TestValidator.error("invalid sort field rejected", async () => {
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          sort: "invalid_field:asc",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  });
  // Test invalid sort direction to verify 400 error
  await TestValidator.error("invalid sort direction rejected", async () => {
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          sort: "created_at:invalid",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  });
  // Verify valid sort combinations work
  const sortAsc =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          sort: "created_at:asc",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sortAsc);
  const sortDesc =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          sort: "created_at:desc",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sortDesc);
  const sortAdministrator =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          sort: "administrator_id:asc",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sortAdministrator);
  const sortReason =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          sort: "reason:desc",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sortReason);
  // Verify empty sort parameter uses default (created_at DESC)
  const emptySort =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: { sort: undefined } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(emptySort);
  // 7. Date Range Validation
  // Test invalid date format for banned_at_after to verify 400 error
  await TestValidator.error("invalid date format rejected", async () => {
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: "not-a-date",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  });
  // Test invalid date format for created_at_before to verify 400 error
  await TestValidator.error(
    "invalid created_at_before format rejected",
    async () => {
      await api.functional.ecommerceMall.administrator.user_bans.index(
        adminConnection,
        {
          body: {
            created_at_before: "not-a-date",
          } satisfies IEcommerceMallUserBan.IRequest,
        },
      );
    },
  );
  // Test valid date range that includes all records (no filtering effect)
  const validDateRange =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          banned_at_before: new Date().toISOString(),
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(validDateRange);
  // 8. Empty Results Handling
  // Call with filters matching no records
  const emptyResults =
    await api.functional.ecommerceMall.administrator.user_bans.index(
      adminConnection,
      {
        body: {
          user_type: "customer" as const,
          ban_status: "active" as const,
          administrator_id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals("empty data array", emptyResults.data.length, 0);
  TestValidator.equals("current page is 1", emptyResults.pagination.current, 1);
  TestValidator.equals("records is 0", emptyResults.pagination.records, 0);
  TestValidator.equals("pages is 0", emptyResults.pagination.pages, 0);
}
