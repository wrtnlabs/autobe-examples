import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
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

export async function test_api_admin_ban_records_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering and sorting of ban records via admin endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create test admin accounts that will issue bans
  const adminIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const adminConn: api.IConnection = { host: connection.host };
    const adminResult = await authorize_admin_join(adminConn, {
      body: {
        email: `ban_admin_${i}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    });
    typia.assert(adminResult);
    adminIds.push(adminResult.id);
  }
  // 3. Test filtering by userId
  const userIdFilterBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number &
        tags.Type<"int32"> &
        tags.Default<20> &
        tags.Minimum<1> &
        tags.Maximum<100>
    >(),
    sortBy: "newest" as const,
    userId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IEconomicPoliticalBoardBanRecord.IRequest;
  const userIdFilterResult =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: userIdFilterBody,
      },
    );
  typia.assert(userIdFilterResult);
  // 4. Test filtering by bannedByAdminId
  const bannedByAdminIdFilterBody = {
    page: 1,
    limit: 20,
    sortBy: "newest" as const,
    bannedByAdminId: adminIds[0],
  } satisfies IEconomicPoliticalBoardBanRecord.IRequest;
  const bannedByAdminIdFilterResult =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: bannedByAdminIdFilterBody,
      },
    );
  typia.assert(bannedByAdminIdFilterResult);
  // 5. Test date range filtering
  const createdAtFrom = new Date(Date.now() - 86400000 * 7).toISOString();
  const createdAtTo = new Date().toISOString();
  const dateRangeFilterBody = {
    page: 1,
    limit: 20,
    sortBy: "newest" as const,
    createdAtFrom,
    createdAtTo,
  } satisfies IEconomicPoliticalBoardBanRecord.IRequest;
  const dateRangeFilterResult =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: dateRangeFilterBody,
      },
    );
  typia.assert(dateRangeFilterResult);
  // 6. Test reason keyword filtering
  const reasonKeywordFilterBody = {
    page: 1,
    limit: 20,
    sortBy: "newest" as const,
    reasonKeyword: "violation",
  } satisfies IEconomicPoliticalBoardBanRecord.IRequest;
  const reasonKeywordFilterResult =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: reasonKeywordFilterBody,
      },
    );
  typia.assert(reasonKeywordFilterResult);
  // 7. Test sorting by oldest
  const oldestSortBody = {
    page: 1,
    limit: 20,
    sortBy: "oldest" as const,
  } satisfies IEconomicPoliticalBoardBanRecord.IRequest;
  const oldestSortResult =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: oldestSortBody,
      },
    );
  typia.assert(oldestSortResult);
  // 8. Test combined filters
  const combinedFilterBody = {
    page: 1,
    limit: 20,
    sortBy: "oldest" as const,
    userId: typia.random<string & tags.Format<"uuid">>(),
    createdAtFrom,
    reasonKeyword: "violation",
  } satisfies IEconomicPoliticalBoardBanRecord.IRequest;
  const combinedFilterResult =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: combinedFilterBody,
      },
    );
  typia.assert(combinedFilterResult);
  // 9. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination metadata exists",
    userIdFilterResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    userIdFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    userIdFilterResult.pagination.pages >= 0,
  );
  // 10. Validate sorting (oldest first means timestamps should be in ascending order)
  if (oldestSortResult.data.length > 1) {
    const timestamps = oldestSortResult.data.map(
      (record: IEconomicPoliticalBoardBanRecord.ISummary) =>
        new Date(record.createdAt).getTime(),
    );
    let sortedCorrectly = true;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] < timestamps[i - 1]) {
        sortedCorrectly = false;
        break;
      }
    }
    TestValidator.equals("sorted by oldest ascending", sortedCorrectly, true);
  }
  // 11. Validate that filter results are arrays
  TestValidator.equals(
    "userId filter returns array",
    Array.isArray(userIdFilterResult.data),
    true,
  );
  TestValidator.equals(
    "bannedByAdminId filter returns array",
    Array.isArray(bannedByAdminIdFilterResult.data),
    true,
  );
  TestValidator.equals(
    "date range filter returns array",
    Array.isArray(dateRangeFilterResult.data),
    true,
  );
  TestValidator.equals(
    "reason keyword filter returns array",
    Array.isArray(reasonKeywordFilterResult.data),
    true,
  );
  TestValidator.equals(
    "combined filter returns array",
    Array.isArray(combinedFilterResult.data),
    true,
  );
}
