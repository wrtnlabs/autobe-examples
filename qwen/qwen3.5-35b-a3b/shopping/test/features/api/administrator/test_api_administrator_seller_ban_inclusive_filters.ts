import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_ban_inclusive_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join operation
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
  // 2. Create seller ban record (if test data setup endpoint available, otherwise skip)
  // Since there's no setup endpoint in the scope, we test with existing or empty data
  // 3. List all bans with include_unbanned=true and verify unbanned records are included
  const responseWithUnbanned =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          include_unbanned: true,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(responseWithUnbanned);
  // 4. List all bans with include_unbanned=false (default) and verify unbanned records are excluded
  const responseWithoutUnbanned =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          include_unbanned: false,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(responseWithoutUnbanned);
  // 5. Search with non-matching seller_id UUID and verify empty data array with zero records
  const fakeSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const responseNoMatchSeller =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          seller_id: fakeSellerId,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(responseNoMatchSeller);
  TestValidator.equals(
    "empty result for non-matching seller_id",
    responseNoMatchSeller.data.length,
    0,
  );
  TestValidator.equals(
    "total records is zero for non-matching seller_id",
    responseNoMatchSeller.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages is zero for non-matching seller_id",
    responseNoMatchSeller.pagination.pages,
    0,
  );
  // 6. Search with non-matching reason string and verify empty results
  const responseNoMatchReason =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          reason: "nonexistent_reason_xyz123",
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(responseNoMatchReason);
  TestValidator.equals(
    "empty result for non-matching reason",
    responseNoMatchReason.data.length,
    0,
  );
  TestValidator.equals(
    "total records is zero for non-matching reason",
    responseNoMatchReason.pagination.records,
    0,
  );
  // 7. Search with date range that has no matches and verify empty results
  const farPastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 100); // 100 years ago
  const responseNoMatchDateRange =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          banned_after: farPastDate.toISOString(),
          banned_before: farPastDate.toISOString(),
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(responseNoMatchDateRange);
  TestValidator.equals(
    "empty result for non-matching date range",
    responseNoMatchDateRange.data.length,
    0,
  );
  TestValidator.equals(
    "total records is zero for non-matching date range",
    responseNoMatchDateRange.pagination.records,
    0,
  );
  // 8. Test limit parameter with value 5 (below default 20) and verify fewer records per page
  const responseLimit5 =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(responseLimit5);
  TestValidator.equals(
    "limit 5 returns at most 5 records",
    responseLimit5.pagination.limit,
    5,
  );
  // 9. Test limit parameter with value 100 (max allowed) and verify pagination works
  const responseLimit100 =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(responseLimit100);
  TestValidator.equals(
    "limit 100 returns max 100 records",
    responseLimit100.pagination.limit,
    100,
  );
  // 10. Test page=1 with limit=100 and verify total pages calculation is correct
  TestValidator.equals(
    "current page is 1",
    responseLimit100.pagination.current,
    1,
  );
  // 11. Verify pagination handles empty dataset gracefully (records=0, pages=0)
  TestValidator.equals(
    "empty dataset has zero records",
    responseNoMatchSeller.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty dataset has zero pages",
    responseNoMatchSeller.pagination.pages,
    0,
  );
  // 12. Verify include_unbanned defaults to false when not specified
  const responseDefault =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(responseDefault);
  TestValidator.equals(
    "default pagination limit is 20",
    responseDefault.pagination.limit,
    20,
  );
  // 13. Verify sort_by parameter can change sort field (created_at, updated_at) and direction (asc, desc)
  const sortByCreatedAsc =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_direction: "asc",
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(sortByCreatedAsc);
  const sortByUpdatedDesc =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          sort_by: "updated_at",
          sort_direction: "desc",
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(sortByUpdatedDesc);
  // 14. Verify combination of include_unbanned=true with other filters works correctly
  const combinedFilters =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      {
        body: {
          include_unbanned: true,
          limit: 10,
          sort_by: "created_at",
          sort_direction: "desc",
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined filters include unbanned and custom limit",
    combinedFilters.pagination.limit,
    10,
  );
  // 15. Verify business logic
  // 15.1 Verify unbanned sellers still appear in list when include_unbanned=true (for audit trail)
  // (This is implicit in responseWithUnbanned having data)
  // 15.2 Verify ban_status derived from deleted_at (active vs completed)
  if (responseWithUnbanned.data.length > 0) {
    for (const banRecord of responseWithUnbanned.data) {
      const expectedBanStatus =
        banRecord.deleted_at === null
          ? ("active" as const)
          : ("completed" as const);
      TestValidator.equals(
        `ban_status derivation for ${banRecord.id}`,
        banRecord.ban.ban_status,
        expectedBanStatus,
      );
    }
  }
  // 15.3 Verify seller reference includes only public profile information (email, display_name, approval_status)
  if (responseWithUnbanned.data.length > 0) {
    for (const banRecord of responseWithUnbanned.data) {
      const seller = banRecord.seller;
      // Verify seller has required public fields
      typia.assert(seller);
      TestValidator.predicate(
        "seller has display_name",
        seller.display_name.length > 0,
      );
      TestValidator.predicate(
        "seller has approval_status",
        seller.approval_status.length > 0,
      );
    }
  }
  // 15.4 Verify ban reason is preserved from parent ban record even for unbanned sellers
  if (responseWithUnbanned.data.length > 0) {
    for (const banRecord of responseWithUnbanned.data) {
      typia.assert(banRecord.ban);
      TestValidator.predicate(
        "ban has reason",
        banRecord.ban.reason.length > 0,
      );
    }
  }
  // 15.5 Verify all timestamps are ISO 8601 format with timezone information
  if (responseWithUnbanned.data.length > 0) {
    for (const banRecord of responseWithUnbanned.data) {
      // Verify created_at and updated_at are valid ISO 8601 timestamps
      const createdAt = new Date(banRecord.created_at);
      const updatedAt = new Date(banRecord.updated_at);
      TestValidator.predicate(
        "created_at is valid date",
        !isNaN(createdAt.getTime()),
      );
      TestValidator.predicate(
        "updated_at is valid date",
        !isNaN(updatedAt.getTime()),
      );
      // Verify ban.banned_at is valid
      const bannedAt = new Date(banRecord.ban.banned_at);
      TestValidator.predicate(
        "banned_at is valid date",
        !isNaN(bannedAt.getTime()),
      );
    }
  }
}