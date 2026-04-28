import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering activity logs by date range and acting member with boundary validation.
 *
 * Validates that activity logs can be correctly filtered by the acting member's UUID and an
 * inclusive date range. Ensures date boundary checks work as expected with >= dateFrom and <= dateTo.
 * Verifies that logs outside the date range are excluded and logs from other members are not included.
 * Tests ordering by creation date descending.
 *
 * Special attention is given to verifying that date range filtering uses inclusive boundaries,
 * results are sorted correctly, and filtering by member alone (without date range) returns
 * all logs for that member.
 *
 * 1. Register and authenticate a new member to obtain memberId and generate activity logs.
 * 2. Query activity logs with memberId and inclusive date range (past to now).
 * 3. Validate all returned logs belong to the acting member.
 * 4. Validate all logs fall within the specified date boundaries.
 * 5. Validate results are ordered by createdAt DESC.
 * 6. Query with a future date range to confirm empty results.
 * 7. Query with only memberId (no date range) to confirm all logs for member are returned.
 */
export async function test_api_activity_log_filter_by_date_and_actor(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const memberId: string & tags.Format<"uuid"> = member.id;
  // 2. Define date range - past date to current time (inclusive boundaries)
  const dateFrom = "2023-01-01T00:00:00Z";
  const dateTo = new Date().toISOString();
  // 3. Query activity logs filtered by memberId and date range
  const bodyWithRange = {
    memberId,
    dateFrom,
    dateTo,
    limit: 100,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const logsInRange =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: bodyWithRange,
      },
    );
  typia.assert(logsInRange);
  // 4. Validate all returned logs belong to the acting member
  const allLogsByActor = logsInRange.data.every(
    (log) => log.member.id === memberId,
  );
  TestValidator.predicate(
    "all returned logs belong to the acting member",
    allLogsByActor,
  );
  // 5. Validate all logs fall within the inclusive date boundaries
  const dateFromTs = new Date(dateFrom).getTime();
  const dateToTs = new Date(dateTo).getTime();
  const allLogsWithinRange = logsInRange.data.every((log) => {
    const logTs = new Date(log.createdAt).getTime();
    return logTs >= dateFromTs && logTs <= dateToTs;
  });
  TestValidator.predicate(
    "all logs within inclusive date range",
    allLogsWithinRange,
  );
  // 6. Validate results are ordered by createdAt DESC (newest first)
  const sortedDesc = logsInRange.data.every((log, idx, arr) => {
    if (idx === 0) return true;
    const prevTs = new Date(arr[idx - 1].createdAt).getTime();
    const currTs = new Date(log.createdAt).getTime();
    return prevTs >= currTs;
  });
  TestValidator.predicate("results ordered by createdAt DESC", sortedDesc);
  // 7. Query with a future date range to confirm empty results
  const futureDateFrom = new Date(Date.now() + 86400000 * 365).toISOString(); // 1 year from now
  const futureDateTo = new Date(Date.now() + 86400000 * 365 * 2).toISOString(); // 2 years from now
  const bodyFutureRange = {
    memberId,
    dateFrom: futureDateFrom,
    dateTo: futureDateTo,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const emptyLogs = await api.functional.hrmPlatform.member.activity_logs.index(
    memberConnection,
    {
      body: bodyFutureRange,
    },
  );
  typia.assert(emptyLogs);
  TestValidator.equals(
    "future date range returns empty results",
    emptyLogs.data.length,
    0,
  );
  // 8. Query with only memberId (no date range) to verify all member logs returned
  const bodyMemberOnly = {
    memberId,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const allMemberLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: bodyMemberOnly,
      },
    );
  typia.assert(allMemberLogs);
  TestValidator.predicate(
    "all member logs returned when no date range specified",
    allMemberLogs.data.length > 0,
  );
  // Validate all returned logs still belong to the acting member
  const allMemberLogsByActor = allMemberLogs.data.every(
    (log) => log.member.id === memberId,
  );
  TestValidator.predicate(
    "logs without date range filter belong to correct member",
    allMemberLogsByActor,
  );
}
