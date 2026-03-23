import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge cases for timesheet listing including empty states and pagination behavior.
 * 1. Verify empty state returns records=0, pages=0, empty data array
 * 2. Verify filters with no matches return empty data with correct pagination
 * 3. Verify pagination calculates pages as ceiling(records/limit)
 * 4. Verify out-of-range page requests return empty data with accurate metadata
 * 5. Verify limit parameter respects min (1) and max (100) constraints
 * 6. Verify default pagination values (page=1, limit=20) when not provided
 * 7. Verify current page in metadata reflects requested page after validation
 * 8. Verify all pagination fields present: current, limit, records, pages
 */
export async function test_api_timesheet_list_empty_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Test empty state (no timesheets exist)
  const emptyResponse = await api.functional.hrmPlatform.admin.timesheets.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformTimesheet.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty state - records is 0",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty state - pages is 0",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty state - data array is empty",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty state - default page is 1",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty state - default limit is 20",
    emptyResponse.pagination.limit,
    20,
  );
  // 3. Test with status filter that returns no results
  const noMatchResponse =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        status: "draft",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no match - records is 0",
    noMatchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match - pages is 0",
    noMatchResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no match - data array is empty",
    noMatchResponse.data.length,
    0,
  );
  // 4. Test with date range filter that returns no results
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 365);
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 365);
  const dateRangeResponse =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        week_start_date_from: futureDate.toISOString(),
        week_start_date_to: futureDate.toISOString(),
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range no match - records is 0",
    dateRangeResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range no match - pages is 0",
    dateRangeResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "date range no match - data array is empty",
    dateRangeResponse.data.length,
    0,
  );
  // 5. Test pagination with page beyond available pages (should return empty data)
  const beyondPageResponse =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        page: 999,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond page - records is 0",
    beyondPageResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond page - pages is 0",
    beyondPageResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "beyond page - data array is empty",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page - current reflects requested page",
    beyondPageResponse.pagination.current,
    999,
  );
  // 6. Test limit parameter with minimum value (1)
  const minLimitResponse =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        limit: 1,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit - limit is 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.equals(
    "min limit - pages is 0",
    minLimitResponse.pagination.pages,
    0,
  );
  // 7. Test limit parameter with maximum value (100)
  const maxLimitResponse =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        limit: 100,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit - limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit - pages is 0",
    maxLimitResponse.pagination.pages,
    0,
  );
  // 8. Test pagination fields completeness
  TestValidator.predicate(
    "pagination has current field",
    emptyResponse.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit field",
    emptyResponse.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records field",
    emptyResponse.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages field",
    emptyResponse.pagination.pages !== undefined,
  );
  // 9. Test default pagination when neither page nor limit provided
  const defaultPaginationResponse =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {} satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(defaultPaginationResponse);
  TestValidator.equals(
    "default pagination - page is 1",
    defaultPaginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination - limit is 20",
    defaultPaginationResponse.pagination.limit,
    20,
  );
}
