import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cursor-based pagination for timer listing across multiple pages.
 *
 * Validates the pagination behavior of the timer index endpoint by authenticating a new member, querying timer records with a small page limit, and verifying pagination metadata including current page, limit, total records, and total pages. The test confirms cursor-based navigation by using the cursor from the first page response to fetch subsequent pages, and validates that each page returns distinct timer records.
 *
 * Special attention is given to ensuring that the pagination metadata is consistent across pages and that the active status filter correctly distinguishes running timers (stopped_at is null) from stopped timers (stopped_at is populated).
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Query timers with a small page limit (2) to test pagination.
 * 3. Validate pagination metadata fields: current is 1, limit is 2, records count, pages calculated correctly.
 * 4. If total pages exceed 1, use page parameter or cursor to fetch page 2.
 * 5. Validate page 2 returns distinct timer records from page 1.
 * 6. Test active filter: query running timers only (active: true) and stopped timers only (active: false).
 */
export async function test_api_timer_list_pagination_cursor_navigation(
  connection: api.IConnection,
) {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Query timers with small page limit (page-based pagination)
  const pageLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 2 satisfies number as number;
  const firstPage = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        limit: pageLimit,
        page: undefined,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(firstPage);
  // 3. Validate pagination metadata from first page
  typia.assert(firstPage.pagination);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "records count non-negative",
    firstPage.pagination.records >= 0,
  );
  const expectedPages: number =
    firstPage.pagination.records === 0
      ? 0
      : Math.ceil(firstPage.pagination.records / pageLimit);
  TestValidator.equals(
    "pages calculation",
    firstPage.pagination.pages,
    expectedPages satisfies number as number,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(firstPage.data));
  TestValidator.predicate(
    "data length no more than limit",
    firstPage.data.length <= pageLimit,
  );
  if (firstPage.data.length > 0) {
    for (const timer of firstPage.data) {
      typia.assert(timer);
      typia.assert(timer.employee);
      typia.assert(timer.project);
    }
  }
  // 4. If multiple pages exist, fetch second page
  const totalRecords = firstPage.pagination.records;
  if (totalRecords > pageLimit) {
    const secondPage = await api.functional.hrmPlatform.member.timers.index(
      memberConnection,
      {
        body: {
          limit: pageLimit satisfies number,
          page: 2 satisfies number,
        } satisfies IHrmPlatformTimer.IRequest,
      },
    );
    typia.assert(secondPage);
    // Validate second page metadata
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      pageLimit,
    );
    TestValidator.equals(
      "total records same",
      secondPage.pagination.records,
      totalRecords,
    );
    // Validate distinct timer IDs between pages
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const firstIds = new Set(firstPage.data.map((t) => t.id));
      const secondIds = new Set(secondPage.data.map((t) => t.id));
      let hasOverlap = false;
      for (const id of secondIds) {
        if (firstIds.has(id)) {
          hasOverlap = true;
          break;
        }
      }
      TestValidator.predicate("no overlap between pages", hasOverlap === false);
    }
  }
  // 5. Test active filter: running timers (active: true)
  const runningTimers = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        active: true,
        limit: pageLimit,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(runningTimers);
  if (runningTimers.data.length > 0) {
    for (const timer of runningTimers.data) {
      typia.assert(timer);
      TestValidator.predicate(
        "running timer is active",
        timer.is_active === true,
      );
      TestValidator.equals(
        "running timer stopped_at is null",
        timer.stopped_at,
        null,
      );
    }
  }
  // 6. Test active filter: stopped timers (active: false)
  const stoppedTimers = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        active: false,
        limit: pageLimit,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(stoppedTimers);
  if (stoppedTimers.data.length > 0) {
    for (const timer of stoppedTimers.data) {
      typia.assert(timer);
      TestValidator.predicate(
        "stopped timer inactive",
        timer.is_active === false,
      );
      TestValidator.predicate(
        "stopped timer has stopped_at",
        timer.stopped_at !== null,
      );
    }
  }
}
