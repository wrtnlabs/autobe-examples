import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator audit log filtering by date range functionality.
 *
 * Validates that an authenticated administrator can filter audit logs using date range parameters. Tests various date range scenarios including start_date only, end_date only, both dates combined, and empty result sets. Verifies that pagination metadata accurately reflects filtered results and that logs within the range are sorted by created_at descending.
 *
 * Special attention is given to ensuring inclusive date boundaries (>= start_date AND <= end_date) and that the API correctly handles edge cases such as date ranges with no matching logs.
 *
 * 1. Register and authenticate as an administrator
 * 2. Test filtering with both start_date and end_date
 * 3. Verify all returned logs fall within the specified date range
 * 4. Test filtering with start_date only
 * 5. Test filtering with end_date only
 * 6. Test filtering with a date range that returns no results
 * 7. Verify pagination metadata matches filtered result count
 * 8. Verify results are sorted by created_at descending within the range
 */
export async function test_api_administrator_audit_logs_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Calculate date ranges for testing
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const twoDaysAgo = new Date(now.getTime() - 2 * oneDay).toISOString();
  const yesterday = new Date(now.getTime() - oneDay).toISOString();
  const tomorrow = new Date(now.getTime() + oneDay).toISOString();
  const farFuture = new Date(now.getTime() + 365 * oneDay).toISOString();
  // 2. Test filtering with both start_date and end_date
  const bothDatesRequest = {
    start_date: twoDaysAgo,
    end_date: tomorrow,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallAdministratorAuditLog.IRequest;
  const bothDatesResponse =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      { body: bothDatesRequest },
    );
  typia.assert(bothDatesResponse);
  // Verify all logs fall within the date range
  await ArrayUtil.asyncForEach(bothDatesResponse.data, async (log) => {
    const logDate = new Date(log.created_at).getTime();
    const startDate = new Date(twoDaysAgo).getTime();
    const endDate = new Date(tomorrow).getTime();
    TestValidator.predicate(
      `log ${log.id} created_at within range`,
      logDate >= startDate && logDate <= endDate,
    );
  });
  // Verify pagination metadata
  TestValidator.equals(
    "pagination records matches data length",
    bothDatesResponse.pagination.records,
    bothDatesResponse.data.length,
  );
  // 3. Test filtering with start_date only
  const startDateOnlyRequest = {
    start_date: yesterday,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallAdministratorAuditLog.IRequest;
  const startDateOnlyResponse =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      { body: startDateOnlyRequest },
    );
  typia.assert(startDateOnlyResponse);
  // Verify all logs are from start_date onwards
  const startDateOnlyTime = new Date(yesterday).getTime();
  await ArrayUtil.asyncForEach(startDateOnlyResponse.data, async (log) => {
    const logDate = new Date(log.created_at).getTime();
    TestValidator.predicate(
      `log ${log.id} created_at >= start_date`,
      logDate >= startDateOnlyTime,
    );
  });
  TestValidator.equals(
    "start_date only pagination matches",
    startDateOnlyResponse.pagination.records,
    startDateOnlyResponse.data.length,
  );
  // 4. Test filtering with end_date only
  const endDateOnlyRequest = {
    end_date: yesterday,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallAdministratorAuditLog.IRequest;
  const endDateOnlyResponse =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      { body: endDateOnlyRequest },
    );
  typia.assert(endDateOnlyResponse);
  // Verify all logs are up to end_date
  const endDateOnlyTime = new Date(yesterday).getTime();
  await ArrayUtil.asyncForEach(endDateOnlyResponse.data, async (log) => {
    const logDate = new Date(log.created_at).getTime();
    TestValidator.predicate(
      `log ${log.id} created_at <= end_date`,
      logDate <= endDateOnlyTime,
    );
  });
  TestValidator.equals(
    "end_date only pagination matches",
    endDateOnlyResponse.pagination.records,
    endDateOnlyResponse.data.length,
  );
  // 5. Test filtering with a date range that returns no results
  const emptyRangeRequest = {
    start_date: farFuture,
    end_date: farFuture,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallAdministratorAuditLog.IRequest;
  const emptyRangeResponse =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      { body: emptyRangeRequest },
    );
  typia.assert(emptyRangeResponse);
  TestValidator.equals(
    "empty range returns empty array",
    emptyRangeResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty range pagination records is 0",
    emptyRangeResponse.pagination.records,
    0,
  );
  // 6. Verify sorting by created_at descending
  if (bothDatesResponse.data.length > 1) {
    for (let i = 1; i < bothDatesResponse.data.length; i++) {
      const prevDate = new Date(
        bothDatesResponse.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(bothDatesResponse.data[i].created_at).getTime();
      TestValidator.predicate(
        `logs sorted descending at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
