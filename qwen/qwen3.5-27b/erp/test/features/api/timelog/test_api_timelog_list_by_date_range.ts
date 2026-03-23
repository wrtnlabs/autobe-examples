import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timelog list retrieval filtered by date range.
 *
 * This test validates the timelog listing functionality with date range filtering:
 * 1. Authenticate as a member user
 * 2. Query timelogs with specific date range parameters
 * 3. Verify pagination metadata and response structure
 * 4. Test edge cases: empty results, single day range, future dates
 */
export async function test_api_timelog_list_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Query timelogs with date range filter
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = new Date();
  const response = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate business logic: all timelogs within date range
  for (const timelog of response.data) {
    const timelogDate = new Date(timelog.date).getTime();
    TestValidator.predicate(
      `timelog date within range: ${timelog.id}`,
      timelogDate >= startDate.getTime() && timelogDate <= endDate.getTime(),
    );
    TestValidator.predicate(
      `timelog duration is positive: ${timelog.duration}`,
      timelog.duration > 0,
    );
  }
  // 5. Test edge case: empty result set with future dates
  const futureStartDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days in future
  const futureEndDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days in future
  const emptyResponse = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        start_date: futureStartDate.toISOString(),
        end_date: futureEndDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result pagination records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result data array length",
    emptyResponse.data.length,
    0,
  );
  // 6. Test edge case: single day range
  const singleDay = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const singleDayResponse =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        start_date: singleDay.toISOString(),
        end_date: singleDay.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(singleDayResponse);
  TestValidator.predicate(
    "single day range returns valid pagination",
    singleDayResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "single day range data is array",
    Array.isArray(singleDayResponse.data),
  );
  // 7. Verify date descending sort order (most recent first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentDate = new Date(response.data[i].date).getTime();
      const nextDate = new Date(response.data[i + 1].date).getTime();
      TestValidator.predicate(
        `timelogs sorted by date descending at index ${i}`,
        currentDate >= nextDate,
      );
    }
  }
}
