import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_logs_date_range_boundary_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with fresh connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Fetch all activity logs without date filters to establish known data
  const allLogs = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(allLogs);
  TestValidator.predicate(
    "activity logs exist after member join",
    allLogs.data.length > 0,
  );
  // Entries are sorted newest first (descending created_at)
  const newestEntry = allLogs.data[0];
  const oldestEntry = allLogs.data[allLogs.data.length - 1];
  // 3. Test 1: Same date_from and date_to — inclusive both bounds
  const exactRangeResult =
    await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
      body: {
        date_from: oldestEntry.created_at,
        date_to: oldestEntry.created_at,
        limit: 100,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(exactRangeResult);
  TestValidator.predicate(
    "entry at exact timestamp is included (inclusive bounds)",
    exactRangeResult.data.some((e) => e.id === oldestEntry.id),
  );
  TestValidator.predicate(
    "inclusive range pagination records count is positive",
    exactRangeResult.pagination.records > 0,
  );
  // 4. Test 2: Only date_from — open upper bound
  const dateFromOnlyResult =
    await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
      body: {
        date_from: oldestEntry.created_at,
        limit: 100,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(dateFromOnlyResult);
  TestValidator.predicate(
    "date_from only returns entries from that point onward",
    dateFromOnlyResult.data.length > 0,
  );
  // 5. Test 3: Only date_to — open lower bound
  const dateToOnlyResult =
    await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
      body: {
        date_to: newestEntry.created_at,
        limit: 100,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(dateToOnlyResult);
  TestValidator.predicate(
    "date_to only returns entries up to that point",
    dateToOnlyResult.data.length > 0,
  );
  // 6. Test 4: Narrow range with exclusion verification (requires 3+ entries)
  if (allLogs.data.length >= 3) {
    const midNewer = allLogs.data[1];
    const midOlder = allLogs.data[allLogs.data.length - 2];
    const narrowResult = await api.functional.erpHrm.member.activity_logs.index(
      memberConnection,
      {
        body: {
          date_from: midOlder.created_at,
          date_to: midNewer.created_at,
          limit: 100,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
    typia.assert(narrowResult);
    TestValidator.predicate(
      "newest entry excluded from narrow range (after date_to)",
      !narrowResult.data.some((e) => e.id === newestEntry.id),
    );
    TestValidator.predicate(
      "oldest entry excluded from narrow range (before date_from)",
      !narrowResult.data.some((e) => e.id === oldestEntry.id),
    );
    TestValidator.predicate(
      "middle entries included in narrow range",
      narrowResult.data.length >= 1,
    );
  }
  // 7. Test 5: Future date range — empty results expected
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const futureTo = futureDate.toISOString();
  const futureFrom = new Date();
  futureFrom.setFullYear(futureFrom.getFullYear() + 9);
  const futureFromStr = futureFrom.toISOString();
  const futureRangeResult =
    await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
      body: {
        date_from: futureFromStr,
        date_to: futureTo,
        limit: 100,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(futureRangeResult);
  TestValidator.equals(
    "future date range returns empty data array",
    futureRangeResult.data.length,
    0,
  );
  TestValidator.equals(
    "future date range returns zero total records",
    futureRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range returns zero pages",
    futureRangeResult.pagination.pages,
    0,
  );
  // 8. Pagination metadata accuracy validation
  TestValidator.equals(
    "pagination current page defaults to 1",
    exactRangeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit reflects requested value",
    exactRangeResult.pagination.limit,
    100,
  );
}
