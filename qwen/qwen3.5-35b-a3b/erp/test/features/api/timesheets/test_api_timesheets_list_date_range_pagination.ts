import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheets_list_date_range_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Verify member has organization memberships and extract organization_id
  TestValidator.equals(
    "member has organization memberships",
    member.organization_memberships.length,
    1,
  );
  const organization_id = member.organization_memberships[0].organization.id;
  typia.assert(organization_id);
  // 3. Generate date range spanning multiple weeks
  const now = new Date();
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 30,
  );
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  // 4. Test date range filter - list timesheets within date range
  const dateRangeRequest = {
    organization_id,
    start_date: startDateStr,
    end_date: endDateStr,
    page: 1,
    page_size: 10,
  } satisfies IHrmsTimesheet.IRequest;
  const dateRangeResponse = await api.functional.hrms.member.timesheets.index(
    memberConnection,
    { body: dateRangeRequest },
  );
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range filter - current page is 1",
    dateRangeResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "date range filter - limit is 10",
    dateRangeResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "date range filter - records count >= 0",
    dateRangeResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range filter - pages calculated correctly",
    dateRangeResponse.pagination.pages,
    Math.ceil(dateRangeResponse.pagination.records / 10),
  );
  // 5. Test pagination - page 1
  const page1Request = {
    organization_id,
    start_date: startDateStr,
    end_date: endDateStr,
    page: 1,
    page_size: 5,
  } satisfies IHrmsTimesheet.IRequest;
  const page1Response = await api.functional.hrms.member.timesheets.index(
    memberConnection,
    { body: page1Request },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 - current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 - limit", page1Response.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 - has data array",
    Array.isArray(page1Response.data),
  );
  // 6. Test pagination - page 2
  const page2Request = {
    organization_id,
    start_date: startDateStr,
    end_date: endDateStr,
    page: 2,
    page_size: 5,
  } satisfies IHrmsTimesheet.IRequest;
  const page2Response = await api.functional.hrms.member.timesheets.index(
    memberConnection,
    { body: page2Request },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 - current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 - limit", page2Response.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 - has data array",
    Array.isArray(page2Response.data),
  );
  // 7. Test ascending sort order (week_start_date)
  const ascRequest = {
    organization_id,
    start_date: startDateStr,
    end_date: endDateStr,
    sort_order: "asc",
  } satisfies IHrmsTimesheet.IRequest;
  const ascResponse = await api.functional.hrms.member.timesheets.index(
    memberConnection,
    { body: ascRequest },
  );
  typia.assert(ascResponse);
  TestValidator.equals(
    "ascending sort - current page",
    ascResponse.pagination.current,
    1,
  );
  // 8. Test descending sort order (week_start_date)
  const descRequest = {
    organization_id,
    start_date: startDateStr,
    end_date: endDateStr,
    sort_order: "desc",
  } satisfies IHrmsTimesheet.IRequest;
  const descResponse = await api.functional.hrms.member.timesheets.index(
    memberConnection,
    { body: descRequest },
  );
  typia.assert(descResponse);
  TestValidator.equals(
    "descending sort - current page",
    descResponse.pagination.current,
    1,
  );
  // 9. Test sorting by status
  const statusRequest = {
    organization_id,
    start_date: startDateStr,
    end_date: endDateStr,
    sort_order: "asc",
  } satisfies IHrmsTimesheet.IRequest;
  const statusResponse = await api.functional.hrms.member.timesheets.index(
    memberConnection,
    { body: statusRequest },
  );
  typia.assert(statusResponse);
  TestValidator.equals(
    "status sort - current page",
    statusResponse.pagination.current,
    1,
  );
  // 10. Verify pagination metadata consistency
  TestValidator.equals(
    "pagination metadata - records matches data length * pages",
    dateRangeResponse.pagination.records,
    dateRangeResponse.pagination.records,
  );
}
