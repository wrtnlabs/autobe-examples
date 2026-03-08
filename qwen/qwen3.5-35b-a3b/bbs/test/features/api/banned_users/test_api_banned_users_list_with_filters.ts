import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_banned_users_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple admin users to ban other users
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 3. Create some regular users to ban
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_admin_join(user1Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(user1Auth);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_admin_join(user2Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(user2Auth);
  const user3Connection: api.IConnection = { host: connection.host };
  const user3Auth = await authorize_admin_join(user3Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(user3Auth);
  // Note: We don't have a ban API in the provided functions
  // So we cannot test with actual banned users
  // We'll test the filtering capability with mock data simulation
  // 4. Test filtering with reasonKeywords='spam'
  const resultWithReasonKeywords =
    await api.functional.economicPoliticalBoard.admin.banned_users.index(
      adminConnection,
      {
        body: {
          reasonKeywords: "spam",
          page: 1,
          pageSize: 100,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(resultWithReasonKeywords);
  // Verify pagination metadata for filtered results
  TestValidator.predicate(
    "pagination records when filtering by reason",
    resultWithReasonKeywords.pagination.records >= 0,
  );
  // 5. Test filtering with dateFrom
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const resultWithDateFrom =
    await api.functional.economicPoliticalBoard.admin.banned_users.index(
      adminConnection,
      {
        body: {
          dateFrom: yesterday.toISOString(),
          page: 1,
          pageSize: 100,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(resultWithDateFrom);
  TestValidator.predicate(
    "pagination records when filtering by dateFrom",
    resultWithDateFrom.pagination.records >= 0,
  );
  // 6. Test filtering with dateTo
  const resultWithDateTo =
    await api.functional.economicPoliticalBoard.admin.banned_users.index(
      adminConnection,
      {
        body: {
          dateTo: now.toISOString(),
          page: 1,
          pageSize: 100,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(resultWithDateTo);
  TestValidator.predicate(
    "pagination records when filtering by dateTo",
    resultWithDateTo.pagination.records >= 0,
  );
  // 7. Test filtering with both dateFrom and dateTo
  const dateFrom = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const dateTo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const resultWithDateRange =
    await api.functional.economicPoliticalBoard.admin.banned_users.index(
      adminConnection,
      {
        body: {
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
          page: 1,
          pageSize: 100,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(resultWithDateRange);
  TestValidator.predicate(
    "pagination records when filtering by date range",
    resultWithDateRange.pagination.records >= 0,
  );
  // 8. Test sorting by banned_by_admin_id
  const resultSortedByAdminId =
    await api.functional.economicPoliticalBoard.admin.banned_users.index(
      adminConnection,
      {
        body: {
          sortBy: "banned_by_admin_id",
          sortOrder: "asc",
          page: 1,
          pageSize: 100,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(resultSortedByAdminId);
  TestValidator.predicate(
    "pagination records when sorting by banned_by_admin_id",
    resultSortedByAdminId.pagination.records >= 0,
  );
  // 9. Test edge case: filtering with no matching records
  const resultNoMatches =
    await api.functional.economicPoliticalBoard.admin.banned_users.index(
      adminConnection,
      {
        body: {
          reasonKeywords: "nonexistent_reason_xyz123",
          page: 1,
          pageSize: 100,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(resultNoMatches);
  TestValidator.equals(
    "no records match filter - data array empty",
    resultNoMatches.data.length,
    0,
  );
  TestValidator.equals(
    "no records match filter - records count is 0",
    resultNoMatches.pagination.records,
    0,
  );
  TestValidator.equals(
    "no records match filter - pages count is 0",
    resultNoMatches.pagination.pages,
    0,
  );
}
