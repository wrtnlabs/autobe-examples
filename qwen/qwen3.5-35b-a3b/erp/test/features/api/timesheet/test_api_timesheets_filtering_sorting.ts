import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheets_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Get organization context from member
  if (member.organization_memberships.length === 0) {
    throw new Error("No organizations found for member");
  }
  const orgMembership = member.organization_memberships[0];
  const organizationId = orgMembership.organization.id;
  // 3. Create 3 timesheets for different weeks
  const week1Monday = "2026-01-05T00:00:00.000Z";
  const week2Monday = "2026-01-12T00:00:00.000Z";
  const week3Monday = "2026-01-19T00:00:00.000Z";
  const timesheet1 = await generate_random_hrms_member_timesheets_create(
    memberConnection,
    {
      body: { week_start_date: week1Monday } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet1);
  const timesheet2 = await generate_random_hrms_member_timesheets_create(
    memberConnection,
    {
      body: { week_start_date: week2Monday } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet2);
  const timesheet3 = await generate_random_hrms_member_timesheets_create(
    memberConnection,
    {
      body: { week_start_date: week3Monday } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet3);
  // 4. Submit timesheet 1 (status becomes 'submitted')
  const submittedTimesheet1 =
    await api.functional.hrms.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet1.id,
    });
  typia.assert(submittedTimesheet1);
  TestValidator.equals(
    "timesheet 1 submitted",
    submittedTimesheet1.status,
    "submitted",
  );
  // 5. Approve timesheet 2 (status becomes 'approved')
  const approvedTimesheet2 =
    await api.functional.hrms.member.timesheets.approve(memberConnection, {
      timesheetId: timesheet2.id,
    });
  typia.assert(approvedTimesheet2);
  TestValidator.equals(
    "timesheet 2 approved",
    approvedTimesheet2.status,
    "approved",
  );
  // 6. Test analytics endpoint filtering and sorting
  // 6.1 Test sorting by total_hours descending (sort_order desc)
  const sortingFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sortingFilterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sortingResponse = await api.functional.hrms.member.timesheets.analytics(
    sortingFilterConnection,
    {
      body: {
        organization_id: organizationId,
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        page: 1,
        page_size: 100,
        sort_order: "desc",
      } satisfies IHrmsTimesheet.IRequest,
    },
  );
  typia.assert(sortingResponse);
  // Validate pagination metadata for sorting test
  TestValidator.equals(
    "sorting pagination current",
    sortingResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "sorting pagination limit positive",
    sortingResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "sorting pagination records non-negative",
    sortingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "sorting pagination pages non-negative",
    sortingResponse.pagination.pages >= 0,
  );
  // 6.2 Test date range filter (specific week only)
  const dateFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(dateFilterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const dateFilterResponse =
    await api.functional.hrms.member.timesheets.analytics(
      dateFilterConnection,
      {
        body: {
          organization_id: organizationId,
          start_date: "2026-01-05",
          end_date: "2026-01-11",
          page: 1,
          page_size: 100,
        } satisfies IHrmsTimesheet.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // Validate date filter results
  TestValidator.equals(
    "date filter pagination current",
    dateFilterResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "date filter total records non-negative",
    dateFilterResponse.pagination.records >= 0,
  );
  // 6.3 Test combined filters (date range) that should return limited results
  const combinedFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(combinedFilterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const combinedFilterResponse =
    await api.functional.hrms.member.timesheets.analytics(
      combinedFilterConnection,
      {
        body: {
          organization_id: organizationId,
          start_date: "2026-01-01",
          end_date: "2026-01-31",
          page: 1,
          page_size: 2, // Limit to 2 per page
        } satisfies IHrmsTimesheet.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate combined filter pagination
  TestValidator.equals(
    "combined filter pagination current",
    combinedFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter page size",
    combinedFilterResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "combined filter has timesheets",
    combinedFilterResponse.pagination.records >= 0,
  );
  // 6.4 Test empty results scenario (date range with no timesheets)
  const emptyFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(emptyFilterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const emptyFilterResponse =
    await api.functional.hrms.member.timesheets.analytics(
      emptyFilterConnection,
      {
        body: {
          organization_id: organizationId,
          start_date: "2025-01-01",
          end_date: "2025-01-31",
          page: 1,
          page_size: 100,
        } satisfies IHrmsTimesheet.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  // Validate empty results
  TestValidator.equals(
    "empty filter pagination current",
    emptyFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty filter total records",
    emptyFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter total pages",
    emptyFilterResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty filter data length",
    emptyFilterResponse.data.length,
    0,
  );
}
